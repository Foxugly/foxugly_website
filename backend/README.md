# foxugly — Backend Django

API REST (Django + Django REST Framework) qui pilote tout le contenu du site.
Le frontend Angular consomme cette API ; l'admin permet d'éditer chaque texte.

## Architecture du contenu

Le site fonctionne comme un **page builder** :

- **Page** — une page du site (accueil, qui-suis-je, agilité, projets, partenaires).
- **Block** — une section ordonnable et typée à l'intérieur d'une page. Tout le
  texte du bloc est dans un champ JSON `content`, donc **tout est éditable**.
  Types : hero, en-tête de page, texte enrichi, chiffres, cartes, frise,
  accordéon, témoignages, mur de logos, listes (actualités / projets /
  clients-associations), appel à l'action.
- **Collections** — Actualités, Projets, Clients & Associations, Témoignages :
  des modèles dédiés qu'un bloc « liste » affiche.
- **Réglages du site** — nom de marque, accroche, email, pied de page.

Cette structure est la fondation d'un éditeur visuel : l'admin Angular pourra
ajouter / réordonner / éditer les blocs (via GrapesJS dans une étape suivante).

## Démarrage

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows : venv\Scripts\activate
pip install -r requirements.txt

python manage.py migrate
python manage.py seed_content   # charge le contenu de la maquette
python manage.py createsuperuser
python manage.py runserver
```

- Admin Django : http://127.0.0.1:8000/admin/
- API : http://127.0.0.1:8000/api/

## Principaux points d'API

| Endpoint | Description |
|---|---|
| `GET /api/pages/` | Liste des pages (navigation) |
| `GET /api/pages/<slug>/` | Page + ses blocs visibles, ordonnés |
| `GET /api/blocks/?page=<slug>` | Blocs d'une page (édition) |
| `POST /api/blocks/reorder/` | Réordonner des blocs `[{id, order}]` |
| `GET /api/news/` | Actualités publiées |
| `GET /api/projects/?sector=Banque` | Projets (filtrables par secteur) |
| `GET /api/partners/?kind=association` | Clients / associations |
| `GET /api/testimonials/` | Témoignages |
| `GET /api/settings/` | Réglages globaux |

Lecture publique ; l'écriture exige une session authentifiée (admin).
