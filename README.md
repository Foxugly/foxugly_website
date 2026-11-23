# foxugly.com

Site vitrine de **foxugly** (coaching agile) : API Django REST (`backend/`) et SPA Angular + Optimus UI (fork MIT de PrimeNG 21)
(`frontend/`). Tout le contenu est un **page builder** — chaque page est une liste de blocs typés,
éditables depuis le back-office `/admin/`. En production sur https://foxugly.com.

## Développement

Backend (Python 3.14 en local et en prod — deadsnakes `/usr/bin/python3.14` sur le box) — détails dans [`backend/README.md`](backend/README.md) :

```powershell
cd backend
py -3.14 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.in -r requirements-dev.txt
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py seed_content      # contenu de démo (une seule fois)
.\.venv\Scripts\python.exe manage.py runserver 8001
.\.venv\Scripts\python.exe manage.py test
.\.venv\Scripts\python.exe -m ruff check .
```

Frontend (Node 22) — `npm start` proxifie `/api` vers `127.0.0.1:8001` :

```powershell
cd frontend
npm ci
npm start          # http://localhost:4200
npm run lint
npm test
npm run build
```

Tests de bout en bout (Playwright) : `cd e2e; npm ci; npm test` — voir [`TESTS.md`](TESTS.md).

## Documentation

| Fichier | Contenu |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | Architecture, API, blocs, admin 2FA, charte graphique, contexte produit |
| [`DEPLOY.md`](DEPLOY.md) | Déploiement (CI → S3 → SSM), secrets SSM, sudoers, monitoring |
| [`TESTS.md`](TESTS.md) | Stratégie de tests |
| [`deploy/iam/README.md`](deploy/iam/README.md) | Rôles IAM et bucket de déploiement |
| [`FRONTEND_BRIEF.md`](FRONTEND_BRIEF.md) | Brief de construction du frontend (historique) |
| [`maquette/`](maquette/) | Maquette HTML statique : référence de design (non livrée) |

Chaque push sur `main` déploie automatiquement (GitHub Actions → OIDC → AWS SSM).
