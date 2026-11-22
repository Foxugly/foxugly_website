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
VENV=/var/www/django_websites/foxugly/backend/.venv

# Le venv doit tourner sur $PYTHON (python3.14 deadsnakes, root, dans /usr/bin).
# Un venv sur une autre version (ou absent) est reconstruit À SON CHEMIN FINAL —
# jamais construit ailleurs puis déplacé : les shebangs des console-scripts
# (.venv/bin/gunicorn, utilisé par l'unit) codent le chemin du venv en dur.
# L'ancien est gardé en .venv.prev et remis en place si la reconstruction échoue.
PYTHON=/usr/bin/python3.14
PY_WANT="$("$PYTHON" -c 'import sys; print("%d.%d" % sys.version_info[:2])')"
PY_HAVE="$("$VENV/bin/python" -c 'import sys; print("%d.%d" % sys.version_info[:2])' 2>/dev/null || echo none)"
if [ "$PY_HAVE" != "$PY_WANT" ]; then
    echo ">>> Rebuilding the venv: Python $PY_HAVE -> $PY_WANT..."
    rm -rf "$VENV.prev"
    if [ -e "$VENV" ]; then mv "$VENV" "$VENV.prev"; fi
    if ! { "$PYTHON" -m venv "$VENV" \
           && "$VENV/bin/pip" install --quiet --require-hashes --no-deps -r requirements.txt \
           && "$VENV/bin/pip" check; }; then
        echo "ERROR: venv rebuild failed; restoring the previous venv." >&2
        rm -rf "$VENV"
        if [ -e "$VENV.prev" ]; then mv "$VENV.prev" "$VENV"; fi
        exit 1
    fi
fi

. "$VENV/bin/activate"
pip install --upgrade pip
# requirements.txt est le verrou à hashes que la CI teste (généré depuis
# requirements.in par la commande uv de son en-tête). requirements.in déclare
# des plages : un simple `pip install -r` gardait toute version installée encore
# dans la plage, et la prod ratait les correctifs (de sécurité compris) que la
# CI, installée à neuf, testait. --require-hashes installe exactement ces
# versions et ces artefacts, rien n'est résolu sur la machine ; pip check fait
# échouer le déploiement si le verrou oublie une dépendance.
pip install --require-hashes --no-deps -r requirements.txt
pip check

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
