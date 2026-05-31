# Tests — foxugly

Trois suites couvrent le backend, le frontend et les parcours bout-en-bout.

## Backend (Django / DRF) — `backend/content/tests.py`

Base de test isolée, aucun service externe requis.

```bash
cd backend
.venv/Scripts/python.exe manage.py test content        # Windows
# source .venv/bin/activate && python manage.py test content   # Linux/macOS
```

Couvre : lectures publiques (pages, blocs visibles, collections, settings),
permissions staff (anonyme/non-staff → 403, staff → 200, reorder + validation),
auth session (login/logout/me), **magic link** (token valide, usage unique, invalide,
non-staff), formulaire de contact (stockage + validation).

## Frontend (Vitest + jsdom) — `frontend/src/**/*.spec.ts`

```bash
cd frontend
npm run test -- --watch=false        # ou : npx ng test --watch=false
```

Couvre : `ContentService` (filtre nav, sendContact), `AuthService` (login,
magic link), `LinkBtn` (interne/externe, fragment), `Hero` (découpe du highlight).

## End-to-end (Playwright) — `e2e/tests/*.spec.ts`

Suppose les **serveurs dev lancés** (frontend `:4200` proxy → backend `:8001`) :

```bash
# backend :  cd backend && .venv/Scripts/python.exe manage.py runserver 127.0.0.1:8001
# frontend : cd frontend && npm start
cd e2e
npm install
npx playwright install chromium      # une fois
npx playwright test
```

Couvre : rendu public piloté par l'API (hero/highlight + formulaire contact),
navigation `/:slug`, envoi du formulaire de contact, admin (login mot de passe →
dashboard, garde de route, demande de magic link).

Cibler un autre environnement (p.ex. la prod) :
```bash
E2E_BASE_URL=https://foxugly.com npx playwright test
```
