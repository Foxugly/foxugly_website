"""Contenus par défaut partagés (évite la duplication entre seed et code).

NB : les migrations de données déjà appliquées gardent leur propre copie figée
(une migration représente un état historique et ne doit pas dépendre de ce
module, qui peut évoluer). Cette constante sert au seed et à toute logique
applicative future.
"""

# Cartes flottantes du hero d'accueil (placeholders, éditables dans l'admin).
DEFAULT_HERO_CARDS = [
    {"icon": "🚀", "label": "Time-to-market", "value": "−40 % en moyenne"},
    {"icon": "🤝", "label": "Équipes coachées", "value": "+120 squads"},
    {"icon": "📈", "label": "Satisfaction", "value": "4,9 / 5"},
]
