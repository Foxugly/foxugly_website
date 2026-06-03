# foxugly — site web

Site de **foxugly**, cabinet de **coaching agile indépendant** (une seule personne :
Renaud Vilain). Stack : **Django REST** (backend) + **Angular / PrimeNG** (frontend).
Les deux sont **construits, testés et déployés** (CI GitHub Actions → AWS EC2).

## Structure du dépôt

```
foxugly website/
├── maquette/      Maquette HTML statique = RÉFÉRENCE DE DESIGN (ne pas livrer en prod)
│   ├── index.html, qui-suis-je.html, agilite.html, projets.html,
│   │   partenaires.html, admin.html
│   ├── style.css  ← tokens couleurs, composants (source de la charte)
│   └── assets/    logo.svg, logo-white.svg, favicon.ico
├── backend/       Django + DRF — API REST (voir backend/README.md)
├── frontend/      Angular + PrimeNG — site public + back-office admin
├── e2e/           Tests Playwright (public, admin, contact)
└── deploy/        Units systemd, nginx, scripts AWS (voir DEPLOY.md)
```

## Charte graphique (reprendre depuis maquette/style.css)

- **Style** : sobre, moderne. Beaucoup de blanc, coins arrondis (~16px), ombres légères.
- **Couleur dominante** : navy `#1b1a30` (= couleur du logo).
- **Accent unique** : vert émeraude `#10b981` (cohérent avec quizonline.foxugly.com),
  réservé aux boutons d'action, liens, tags actifs. Variantes : `--accent-dark #059669`.
- **Texte** : `#1b1a30` (titres), `#54546a` (courant). Police **Inter**.
- **Logo / favicon** : dans `maquette/assets/` (logo navy + version blanche pour fonds sombres).
- Hero et CTA sur fond navy dégradé avec halo vert discret.

## Backend

API REST sur `http://127.0.0.1:8001/api/` (8000 est pris par QuizOnline en local).
Lecture publique, écriture = admin connecté. Auth : session DRF **+ magic-link** par
email (passwordless). Lancer : voir `backend/README.md` (`migrate` → `seed_content` →
`runserver 8001`). Lint : `ruff check .` (config dans `backend/pyproject.toml`).

Endpoints publics non authentifiés qui écrivent (`/api/contact/`, `/api/auth/magic-link/`)
sont **throttlés** (`ScopedRateThrottle`, 5/min) ; le contact a aussi un **honeypot**
(`website`). Sentry (erreurs) est actif si `SENTRY_DSN` est défini, avec `release` = SHA
du commit (fichier `backend/RELEASE` écrit par la CI).

Le contenu suit un modèle **page builder** : chaque page = une liste de **blocs**
typés et ordonnés, dont tout le texte est dans `content` (JSON) → tout est éditable.

Endpoints :
| Endpoint | Usage |
|---|---|
| `GET /api/pages/` | navigation (pages publiées) |
| `GET /api/pages/<slug>/` | page + ses blocs visibles ordonnés |
| `GET /api/blocks/?page=<slug>` | blocs d'une page (édition) |
| `POST /api/blocks/reorder/` | réordonner `[{id, order}]` |
| `GET /api/news/` `GET /api/projects/?sector=` `GET /api/partners/?kind=client|association` | collections |
| `GET /api/testimonials/` `GET /api/settings/` | témoignages, réglages globaux |

Slugs des pages : `accueil`, `qui-suis-je`, `agilite`, `projets`, `partenaires`.

Types de blocs (`block_type`), un composant Angular par type :
`hero`, `page_hero`, `richtext`, `stats`, `cards`, `timeline`, `accordion`,
`testimonials`, `logo_wall`, `news_list`, `project_list`, `partner_list`, `cta`,
`contact_form`, `contact_info`.
La forme de `content` pour chaque type est visible via `seed_content.py` et l'API.

## Frontend (Angular + PrimeNG) — construit

Implémenté et conforme à la maquette. Repères pour intervenir :

1. **Site public piloté par l'API** : route `/:slug` → `GET /api/pages/<slug>/`, rendu par
   `public/block-renderer/` qui mappe `block_type` → composant (`public/blocks/<type>/`).
   Nav/footer alimentés par `/api/pages/` et `/api/settings/` (`layout/`).
2. **Back-office admin** (`admin/`) : login session DRF + magic-link, CRUD pages/blocs/
   collections, réordonnancement des blocs (drag-drop) via `/api/blocks/reorder/`. Les
   formulaires d'édition sont typés par bloc (`admin/blocks/block-form` + `block-schema`).
   `admin/collections/collection-editor` est **générique** (piloté par une config par
   ressource). Auth/CSRF/proxy : voir la mémoire « Admin dev setup ».
3. **Éditeur visuel GrapesJS** (`admin/pages/visual-editor`) par-dessus le modèle de blocs —
   le modèle de l'API reste la source de vérité. Ne PAS réécrire un page builder from scratch.
4. **Qualité** : tests Vitest (`*.spec.ts`) + e2e Playwright (`e2e/`) ; lint `ng lint`
   (ESLint, config `frontend/eslint.config.js` — a11y de l'admin en warnings). Sentry
   frontend actif si DSN, `release` = SHA injecté au build CI (`sentry.config.ts`).

## Contexte produit

- Renaud est **seul** : pas de mentions d'équipe ("je", pas "nous/nos coachs").
- **Pas** de formations certifiantes (ateliers / formations sur-mesure uniquement).
- "Partenaires" = **références clients** + **associations soutenues** (sponsoring, mécénat,
  don), PAS des partenaires techno.
- Les contenus seedés sont des **placeholders** (chiffres, clients, assos) à remplacer
  par les vraies infos de Renaud.
