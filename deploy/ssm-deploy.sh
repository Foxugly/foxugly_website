#!/usr/bin/env bash
#
# Foxugly — APP deploy step (runs as DJANGO via `sudo -u django`).
#
# Unprivileged half of the deploy (§3.10 / §3.11): everything that touches the
# app tree, the venv and the database runs as django. The privileged half
# (systemd units + nginx vhost) is done by root in foxugly-deploy-privileged.sh
# BEFORE the tree is chown'd to django; the gunicorn restart + the final perms
# normalization run as root in the SSM pipeline AFTER this script.
#
# Backend only: the frontend is already built in the CI bundle
# (frontend/dist/frontend/browser) and served straight by nginx — nothing to
# compile here.
set -euo pipefail
umask 027   # fichiers 640 / dossiers 750, sans écriture-groupe ni accès "autres"

cd /var/www/django_websites/foxugly/backend
[ -d .venv ] || python3 -m venv .venv
. .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Charge TOUT l'env runtime (lecture LITTÉRALE clé=valeur, sans `source` → pas
# d'eval shell sur des valeurs à caractères spéciaux) pour que migrate /
# collectstatic tournent avec les MÊMES settings que gunicorn : SECRET_KEY + les
# DB_* (PostgreSQL) + le reste. Sans les DB_*, foxugly.settings retombe sur
# sqlite et migrate viserait un db.sqlite3 local au lieu de la prod PostgreSQL.
while IFS='=' read -r _k _v || [ -n "$_k" ]; do
    case "$_k" in ''|\#*) continue ;; esac
    export "$_k=$_v"
done < /run/foxugly/.env
unset _k _v

python manage.py migrate --noinput          # jamais seed_content (préserve le contenu)
python manage.py collectstatic --noinput

echo "✓ foxugly app step done (pip + migrate + collectstatic)."
