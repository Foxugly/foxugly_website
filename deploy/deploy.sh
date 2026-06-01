#!/usr/bin/env bash
#
# Déploiement foxugly côté serveur — pattern S3-bundle.
# Exécuté EN ROOT par la commande SSM, APRÈS que le bundle (backend source +
# frontend déjà buildé + deploy/) a été téléchargé depuis S3, extrait dans
# /opt/foxugly et chown foxugly (voir .github/workflows/deploy.yml).
# Aucune compilation ici (pas de git, pas de npm) → léger pour la t3.small.
#
set -euo pipefail

# Backend lancé en tant que django → ownership cohérent (db SQLite, venv, statics).
sudo -u django bash <<'INNER'
set -euo pipefail
cd /opt/foxugly/backend
[ -d .venv ] || python3 -m venv .venv
. .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
python manage.py migrate --noinput          # jamais seed_content (préserve le contenu)
python manage.py collectstatic --noinput
INNER

# Le frontend est déjà buildé dans le bundle (frontend/dist/frontend/browser),
# servi directement par nginx — rien à compiler ici.

# Synchronise la conf nginx depuis le bundle (idempotent) puis recharge si elle
# est valide. Pattern sites-available + symlink sites-enabled (cohérent avec les
# autres sites de la box). Nettoie au passage les anciens emplacements (conf.d et
# le 444-trap zombie www) pour qu'un déploiement converge toujours vers cet état.
cp /opt/foxugly/deploy/nginx.conf /etc/nginx/sites-available/foxugly.com
ln -sf /etc/nginx/sites-available/foxugly.com /etc/nginx/sites-enabled/foxugly.com
rm -f /etc/nginx/conf.d/foxugly.conf /etc/nginx/sites-enabled/www.foxugly.com
if nginx -t; then
    systemctl reload nginx
else
    echo "✗ nginx -t a échoué : conf non rechargée." >&2
    exit 1
fi

systemctl restart foxugly
echo "✓ Déploiement foxugly terminé."
