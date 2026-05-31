# foxugly — site web

Site de **foxugly**, cabinet de **coaching agile indépendant** (une seule personne :
Renaud Vilain). Stack : **Django REST** (backend, fait) + **Angular / PrimeNG**
(frontend, à construire).

## Structure du dépôt

```
foxugly website/
├── maquette/      Maquette HTML statique = RÉFÉRENCE DE DESIGN (ne pas livrer en prod)
│   ├── index.html, qui-suis-je.html, agilite.html, projets.html,
│   │   partenaires.html, admin.html
│   ├── style.css  ← tokens couleurs, composants (source de la charte)
│   └── assets/    logo.svg, logo-white.svg, favicon.ico
├── backend/       Django + DRF — TERMINÉ et vérifié (voir backend/README.md)
└── frontend/      Angular + PrimeNG — À CONSTRUIRE
```

## Charte graphique (reprendre depuis maquette/style.css)

- **Style** : sobre, moderne. Beaucoup de blanc, coins arrondis (~16px), ombres légères.
- **Couleur dominante** : navy `#1b1a30` (= couleur du logo).
- **Accent unique** : vert émeraude `#10b981` (cohérent avec quizonline.foxugly.com),
  réservé aux boutons d'action, liens, tags actifs. Variantes : `--accent-dark #059669`.
- **Texte** : `#1b1a30` (titres), `#54546a` (courant). Police **Inter**.
- **Logo / favicon** : dans `maquette/assets/` (logo navy + version blanche pour fonds sombres).
- Hero et CTA sur fond navy dégradé avec halo vert discret.

## Backend (déjà fait)

API REST sur `http://127.0.0.1:8000/api/`. Lecture publique, écriture = admin connecté.
Lancer : voir `backend/README.md` (`migrate` → `seed_content` → `runserver`).

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

Types de blocs (`block_type`) à rendre côté Angular :
`hero`, `page_hero`, `richtext`, `stats`, `cards`, `timeline`, `accordion`,
`testimonials`, `logo_wall`, `news_list`, `project_list`, `partner_list`, `cta`.
La forme de `content` pour chaque type est visible via `seed_content.py` et l'API.

## Frontend à construire (Angular + PrimeNG)

Objectifs :
1. **Site public piloté par l'API** : router sur `/:slug`, charger `GET /api/pages/<slug>/`,
   et rendre chaque bloc via un composant dédié par `block_type` (un « block renderer »
   qui mappe type → composant). Nav et footer alimentés par `/api/pages/` et `/api/settings/`.
2. **Fidélité au design** de `maquette/` (réutiliser les tokens de `style.css`, thème PrimeNG
   personnalisé navy + émeraude).
3. **Back-office admin Angular** sur-mesure : login (session DRF), CRUD des pages/blocs/
   collections, **réordonnancement des blocs** (drag-drop, PrimeNG OrderList/dnd) appelant
   `/api/blocks/reorder/`. Édition des textes = formulaires par type de bloc.
4. **Étape ultérieure** : couche d'édition visuelle (GrapesJS) par-dessus le modèle de blocs.
   Ne PAS réécrire un page builder visuel from scratch.

Détails : PrimeNG `DataView`/`Card` (projets, partenaires), `Timeline`, `Accordion`,
filtres projets par secteur, filtres partenaires par `kind`. Responsive + menu burger mobile.

## Contexte produit

- Renaud est **seul** : pas de mentions d'équipe ("je", pas "nous/nos coachs").
- **Pas** de formations certifiantes (ateliers / formations sur-mesure uniquement).
- "Partenaires" = **références clients** + **associations soutenues** (sponsoring, mécénat,
  don), PAS des partenaires techno.
- Les contenus seedés sont des **placeholders** (chiffres, clients, assos) à remplacer
  par les vraies infos de Renaud.
