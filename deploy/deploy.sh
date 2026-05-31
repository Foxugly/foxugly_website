#!/usr/bin/env bash
#
# Déploiement foxugly sur le serveur (exécuté en root via SSM Run Command,
# ou manuellement avec sudo). Met à jour le code, le backend et le frontend,
# puis redémarre Gunicorn.
#
#   Usage : deploy.sh [branche]   (défaut : main)
#
set -euo pipefail

APP_DIR="${FOXUGLY_DIR:-/opt/foxugly}"
BRANCH="${1:-main}"

echo "▶ Déploiement foxugly (branche $BRANCH)"

# --- 1. Code à jour --------------------------------------------------------
cd "$APP_DIR"
git fetch --all --prune
git checkout "$BRANCH"
git reset --hard "origin/$BRANCH"

# --- 2. Backend ------------------------------------------------------------
cd "$APP_DIR/backend"
[ -d .venv ] || python3 -m venv .venv
# shellcheck disable=SC1091
. .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
python manage.py migrate --noinput
python manage.py collectstatic --noinput
deactivate

# --- 3. Frontend (build de prod → dist/frontend/browser) -------------------
cd "$APP_DIR/frontend"
npm ci
npm run build

# --- 4. Redémarrage --------------------------------------------------------
systemctl restart foxugly
echo "✓ Déploiement terminé."
