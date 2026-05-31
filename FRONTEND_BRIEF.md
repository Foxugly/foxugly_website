# Brief frontend — foxugly (Angular + PrimeNG)

Document de cadrage pour construire le **frontend Angular**. Le backend Django est
**terminé** et expose une API REST (voir `backend/README.md`). Le frontend doit tout
tirer de cette API pour que le contenu reste éditable depuis l'admin.

Lis aussi `CLAUDE.md` (contexte produit + charte) et `maquette/` (référence visuelle).

---

## 1. Objectif

Un site public **piloté par l'API** + un **back-office admin** sur-mesure.
Modèle « page builder » : une page = une liste de **blocs** typés et ordonnés.
Le frontend mappe chaque `block_type` → un composant Angular dédié (block renderer).

---

## 2. Pré-requis : lancer le backend

```bash
cd backend
python -m venv venv && venv\Scripts\activate   # (ou source venv/bin/activate)
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_content
python manage.py createsuperuser
python manage.py runserver        # API sur http://127.0.0.1:8000/api/
```

CORS est déjà configuré pour `http://localhost:4200`.

---

## 3. Charte graphique (reprendre `maquette/style.css`)

```
--ink        #1b1a30   navy, couleur dominante (= couleur du logo)
--ink-2      #34334e
--ink-soft   #54546a   texte courant
--muted      #8a8a9c
--accent     #10b981   vert émeraude, UNIQUE accent (boutons, liens, tags actifs)
--accent-dark#059669
--accent-soft#e6f7f1
--line       #e9e9ef
--bg         #ffffff
--bg-soft    #f6f6f9
--radius     16px
```

- Police **Inter** (Google Fonts).
- Style sobre : beaucoup de blanc, coins arrondis ~16px, ombres légères.
- Hero / CTA : fond navy dégradé `linear-gradient(160deg,#1b1a30,#2a2942)` + halo vert discret.
- Logo & favicon : `maquette/assets/` (`logo.svg` navy, `logo-white.svg` pour fonds sombres, `favicon.ico`).
- Thème PrimeNG : personnaliser en navy + émeraude (preset Aura, override des tokens primaires sur le vert).
- La maquette HTML (`maquette/*.html`) montre le rendu cible de chaque section.

---

## 4. Architecture Angular cible

- Angular standalone components, routing, `HttpClient`.
- `ContentService` : appels à l'API (pages, blocs, collections, settings).
- Route publique `/:slug` → charge `GET /api/pages/<slug>/` → composant `PageRenderer`
  qui itère sur `blocks` et délègue à un `BlockRenderer` (map `block_type` → composant).
- `/` redirige vers le slug `accueil`.
- Nav + footer : alimentés par `GET /api/pages/` (items `show_in_nav`) et `GET /api/settings/`.
- Responsive, menu burger mobile (voir maquette).
- Un composant par type de bloc (voir §6).

Arborescence suggérée :
```
frontend/src/app/
  core/        content.service.ts, models.ts, auth.service.ts
  public/      page-renderer, block-renderer, blocks/<type>/...
  layout/      navbar, footer
  admin/       login, dashboard, pages-editor, block-form, collections...
```

---

## 5. Contrat d'API

Toutes les réponses de liste sont paginées DRF : `{count, next, previous, results}`.

| Endpoint | Retour |
|---|---|
| `GET /api/pages/` | pages (navigation) : `{id,slug,title,nav_label,order,show_in_nav,is_published}` |
| `GET /api/pages/<slug>/` | page + `blocks[]` (voir §6) |
| `GET /api/blocks/?page=<slug>` | blocs d'une page (édition) |
| `POST /api/blocks/reorder/` | body `[{id, order}, ...]` |
| `GET /api/news/` | `{id,title,slug,category,excerpt,body,date,read_time,order}` |
| `GET /api/projects/?sector=Banque` | `{id,title,sector,description,result,order}` |
| `GET /api/partners/?kind=client\|association` | `{id,name,kind,kind_display,sector_or_cause,description,support_type,link,logo,order}` |
| `GET /api/testimonials/` | `{id,quote,author,role,initials,order}` |
| `GET /api/settings/` | `{brand_name,tagline,contact_email,linkedin_url,footer_text}` |

Lecture publique. **Écriture** (admin) : session DRF — login via `POST /api-auth/login/`
(ou endpoint de session), cookie de session + CSRF token (`X-CSRFToken`) sur les requêtes
d'écriture. `withCredentials: true` côté Angular.

---

## 6. Enveloppe d'un bloc + forme de `content` par type

Chaque bloc : `{ id, block_type, block_type_display, order, is_visible, anchor, content }`.
La forme exacte de `content` (ci-dessous) est aussi visible dans `backend/content/management/commands/seed_content.py`.

```
hero          { badge, title, highlight, text,
                primary_cta:{label,href}, secondary_cta:{label,href} }
page_hero     { badge, title, text }
stats         { items:[ {num, label} ] }
cards         { eyebrow, title, lead?, items:[ {icon, title, text} ] }
richtext      { eyebrow, title, paragraphs:[string], certs?:[string] }
timeline      { eyebrow, title, items:[ {step, title, text} ] }
accordion     { eyebrow, title, items:[ {title, text} ] }
testimonials  { limit }                      → fetch GET /api/testimonials/
news_list     { eyebrow, title, lead?, limit } → fetch GET /api/news/
project_list  { eyebrow?, title?, lead?, limit?, filterable? } → GET /api/projects/ (filtre secteur si filterable)
partner_list  { eyebrow?, title?, lead?, kind } → GET /api/partners/?kind=<kind>
logo_wall     { eyebrow?, title?, items:[ {label} ] }
cta           { title, text, cta:{label,href} }
```

Notes :
- `highlight` (hero) = sous-chaîne de `title` à colorer en vert.
- `anchor` non vide → `id` HTML de la section (liens internes type `/#contact`).
- Listes (`news_list`, `project_list`, `partner_list`, `testimonials`) : le bloc porte les
  titres de section, les **données** viennent de la collection via son endpoint.
- `project_list.filterable` (page projets) → filtres par secteur (PrimeNG, filtrage par
  `?sector=`). `partner_list.kind` distingue clients / associations.

---

## 7. Pages seedées (slug → blocs)

- `accueil` : hero, stats, cards, news_list(#news), project_list, cta(#contact)
- `qui-suis-je` : page_hero, richtext, cards
- `agilite` : page_hero, cards, timeline, accordion, testimonials
- `projets` : page_hero, project_list(filterable), cta
- `partenaires` : page_hero, partner_list(client), testimonials, partner_list(association), cta

---

## 8. Back-office admin (Angular sur-mesure)

- Login session DRF.
- CRUD pages / blocs / collections (news, projects, partners, testimonials) / settings.
- **Réordonnancement des blocs** en drag-drop (PrimeNG OrderList ou Angular CDK DnD) →
  `POST /api/blocks/reorder/`.
- Édition des textes = formulaires **par type de bloc** (un form adapté à la forme de `content`).
- Toggle `is_visible` / `is_published`, gestion de l'ordre.
- **Étape ultérieure** : couche d'édition visuelle **GrapesJS** par-dessus le modèle de blocs.
  Ne PAS réécrire un page builder visuel from scratch.

---

## 9. Ordre de construction recommandé

1. `ng new frontend` (routing, SCSS), installer PrimeNG + thème, importer les tokens de la charte.
2. `ContentService` + modèles TypeScript + layout (navbar/footer depuis l'API).
3. `PageRenderer` + `BlockRenderer` + composants blocs, en commençant par **`accueil`**.
4. Les autres pages (mêmes composants, pilotés par l'API).
5. Filtres (projets/partenaires), responsive, menu mobile.
6. Admin : login → CRUD → réordonnancement des blocs.
7. Plus tard : GrapesJS.

Fidélité visuelle : se référer en continu à `maquette/` (rendu cible) et à `style.css`.
