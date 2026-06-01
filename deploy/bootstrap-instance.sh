#!/usr/bin/env bash
#
# Premier déploiement foxugly sur l'instance (à lancer EN ROOT, une seule fois).
# Suppose que le bundle a déjà été téléchargé et extrait dans /opt/foxugly
# (voir la commande d'amorçage dans le chat / DEPLOY.md).
# Installe les services + nginx, initialise la base, démarre Gunicorn.
#
set -euo pipefail
# Force le rôle d'instance pour aws (ignore d'éventuelles creds certbot par défaut).
export AWS_SHARED_CREDENTIALS_FILE=/dev/null AWS_CONFIG_FILE=/dev/null

chown -R django:www-data /opt/foxugly

echo "== Services systemd =="
cp /opt/foxugly/deploy/foxugly-env.service /etc/systemd/system/
cp /opt/foxugly/deploy/foxugly.service     /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now foxugly-env          # écrit /run/foxugly/.env depuis SSM
test -s /run/foxugly/.env && echo "  /run/foxugly/.env OK" || { echo "  ERREUR: .env vide (SSM ?)"; exit 1; }

echo "== Backend (en tant que django) =="
sudo -u django bash <<'INNER'
set -euo pipefail
set -a; . /run/foxugly/.env; set +a
cd /opt/foxugly/backend
python3 -m venv .venv
. .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
python manage.py migrate --noinput
# seed uniquement si la base est vide (ne jamais écraser un contenu existant)
if python -c "import django,os;os.environ.setdefault('DJANGO_SETTINGS_MODULE','foxugly.settings');django.setup();from content.models import Page;import sys;sys.exit(0 if Page.objects.exists() else 1)"; then
  echo "  contenu déjà présent → pas de seed"
else
  python manage.py seed_content
fi
python manage.py collectstatic --noinput
INNER

systemctl enable --now foxugly              # Gunicorn :8004

echo "== nginx =="
# Pattern sites-available + symlink sites-enabled (cohérent avec les autres sites
# de la box). Nom du vhost = hostname de SITE_URL (déjà chargé depuis SSM par
# foxugly-env.service dans /run/foxugly/.env ; pas de second appel SSM).
SITE_URL=$(grep -m1 '^SITE_URL=' /run/foxugly/.env 2>/dev/null | cut -d= -f2- || true)
DOMAIN="${SITE_URL#http://}"; DOMAIN="${DOMAIN#https://}"; DOMAIN="${DOMAIN%%/*}"
[ -n "$DOMAIN" ] || DOMAIN=foxugly.com
# Nettoyage EXHAUSTIF avant la pose (apex + www, available + enabled, legacy
# "foxugly", ancien conf.d) → jamais deux fichiers définissant `upstream
# foxugly_app`. rm AVANT cp/ln → pas d'auto-suppression.
rm -f /etc/nginx/conf.d/foxugly.conf \
      /etc/nginx/sites-enabled/foxugly.com     /etc/nginx/sites-available/foxugly.com \
      /etc/nginx/sites-enabled/www.foxugly.com /etc/nginx/sites-available/www.foxugly.com \
      /etc/nginx/sites-enabled/foxugly         /etc/nginx/sites-available/foxugly
cp /opt/foxugly/deploy/nginx.conf "/etc/nginx/sites-available/${DOMAIN}"
ln -sf "/etc/nginx/sites-available/${DOMAIN}" "/etc/nginx/sites-enabled/${DOMAIN}"
nginx -t && systemctl reload nginx

echo
echo "✓ Bootstrap terminé. Le site doit répondre sur https://www.foxugly.com"
echo "→ Crée ton compte admin (nécessaire pour le magic link) :"
echo "   sudo -u django bash -c 'cd /opt/foxugly/backend && . .venv/bin/activate && python manage.py createsuperuser'"
