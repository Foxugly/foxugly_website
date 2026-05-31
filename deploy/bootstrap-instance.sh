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
# conf.d : inclus par tous les nginx (contrairement à sites-enabled, absent des
# builds nginx.org). Le vhost foxugly y coexiste avec quizonline.
cp /opt/foxugly/deploy/nginx.conf /etc/nginx/conf.d/foxugly.conf
rm -f /etc/nginx/sites-enabled/foxugly /etc/nginx/sites-available/foxugly
nginx -t && systemctl reload nginx

echo
echo "✓ Bootstrap terminé. Le site doit répondre sur https://www.foxugly.com"
echo "→ Crée ton compte admin (nécessaire pour le magic link) :"
echo "   sudo -u django bash -c 'cd /opt/foxugly/backend && . .venv/bin/activate && python manage.py createsuperuser'"
