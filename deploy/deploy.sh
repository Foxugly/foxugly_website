#!/usr/bin/env bash
#
# Déploiement foxugly côté serveur — pattern S3-bundle.
# Exécuté EN ROOT par la commande SSM, APRÈS que le bundle (backend source +
# frontend déjà buildé + deploy/) a été téléchargé depuis S3, extrait dans
# /var/www/django_websites/foxugly et chown foxugly (voir .github/workflows/deploy.yml).
# Aucune compilation ici (pas de git, pas de npm) → léger pour la t3.small.
#
set -euo pipefail

# Backend lancé en tant que django → ownership cohérent (db SQLite, venv, statics).
sudo -u django bash <<'INNER'
set -euo pipefail
cd /var/www/django_websites/foxugly/backend
[ -d .venv ] || python3 -m venv .venv
. .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
# Charge la vraie clé secrète (lecture LITTÉRALE via grep/cut, sans sourcer le
# .env → pas d'eval shell sur des valeurs à caractères spéciaux) pour que migrate
# /collectstatic n'utilisent pas une clé aléatoire (warning + clé non stable).
DJANGO_SECRET_KEY=$(grep -m1 '^DJANGO_SECRET_KEY=' /run/foxugly/.env 2>/dev/null | cut -d= -f2- || true)
export DJANGO_SECRET_KEY
python manage.py migrate --noinput          # jamais seed_content (préserve le contenu)
python manage.py collectstatic --noinput
INNER

# Le frontend est déjà buildé dans le bundle (frontend/dist/frontend/browser),
# servi directement par nginx — rien à compiler ici.

# Synchronise la conf nginx depuis le bundle (idempotent) puis recharge si elle
# est valide. Pattern sites-available + symlink sites-enabled (cohérent avec les
# autres sites de la box). Nettoie au passage les anciens emplacements (conf.d et
# le 444-trap zombie www) pour qu'un déploiement converge toujours vers cet état.
#
# Le nom du vhost = hostname de SITE_URL, déjà chargé depuis SSM par
# foxugly-env.service dans /run/foxugly/.env (on ne relit PAS SSM ici). Fallback
# foxugly.com si la variable est absente.
SITE_URL=$(grep -m1 '^SITE_URL=' /run/foxugly/.env 2>/dev/null | cut -d= -f2- || true)
DOMAIN="${SITE_URL#http://}"; DOMAIN="${DOMAIN#https://}"; DOMAIN="${DOMAIN%%/*}"
[ -n "$DOMAIN" ] || DOMAIN=foxugly.com

# Nettoyage EXHAUSTIF avant la pose : on retire TOUTES les variantes gérées
# (apex + www, available + enabled), le legacy "foxugly" et l'ancien conf.d. Sinon
# un changement de nom entre deux déploiements (foxugly.com → www.foxugly.com)
# laisse un second fichier définissant `upstream foxugly_app` → nginx -t en emerg.
# (rm AVANT cp/ln → pas d'auto-suppression même si DOMAIN == un nom listé ici.)
rm -f /etc/nginx/conf.d/foxugly.conf \
      /etc/nginx/sites-enabled/foxugly.com     /etc/nginx/sites-available/foxugly.com \
      /etc/nginx/sites-enabled/www.foxugly.com /etc/nginx/sites-available/www.foxugly.com \
      /etc/nginx/sites-enabled/foxugly         /etc/nginx/sites-available/foxugly
cp /var/www/django_websites/foxugly/deploy/nginx.conf "/etc/nginx/sites-available/${DOMAIN}"
ln -sf "/etc/nginx/sites-available/${DOMAIN}" "/etc/nginx/sites-enabled/${DOMAIN}"
if nginx -t; then
    systemctl reload nginx
else
    echo "✗ nginx -t a échoué : conf non rechargée." >&2
    exit 1
fi

# Sync des units systemd depuis le bundle (idempotent) : permet de faire évoluer
# le service (chemin, options, bind…) sans repasser par bootstrap-instance.sh.
# daemon-reload uniquement si un fichier a réellement changé.
units_changed=0
for unit in foxugly-env.service foxugly-gunicorn.service; do
    if ! cmp -s "/var/www/django_websites/foxugly/deploy/$unit" "/etc/systemd/system/$unit"; then
        cp "/var/www/django_websites/foxugly/deploy/$unit" "/etc/systemd/system/$unit"
        units_changed=1
    fi
done
# Nettoyage de l'ancien unit mono-nom (avant le renommage en foxugly-gunicorn).
if [ -e /etc/systemd/system/foxugly.service ]; then
    systemctl disable --now foxugly.service 2>/dev/null || true
    rm -f /etc/systemd/system/foxugly.service
    units_changed=1
fi
[ "$units_changed" = 1 ] && systemctl daemon-reload

systemctl enable foxugly-gunicorn        # persistance au boot (idempotent)
systemctl restart foxugly-gunicorn
echo "✓ Déploiement foxugly terminé."
