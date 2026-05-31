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

systemctl restart foxugly
echo "✓ Déploiement foxugly terminé."
