"""Écrit les 3 cartes flottantes (time-to-market / équipes coachées / satisfaction)
dans le contenu du bloc hero d'accueil, pour qu'elles soient éditables dans l'admin
au lieu de dépendre du fallback codé en dur du composant. Idempotent : ne fait rien
si des cartes sont déjà présentes.
"""
from django.db import migrations

DEFAULT_CARDS = [
    {"icon": "🚀", "label": "Time-to-market", "value": "−40 % en moyenne"},
    {"icon": "🤝", "label": "Équipes coachées", "value": "+120 squads"},
    {"icon": "📈", "label": "Satisfaction", "value": "4,9 / 5"},
]


def seed_hero_cards(apps, schema_editor):
    Block = apps.get_model("content", "Block")
    hero = Block.objects.filter(page__slug="accueil", block_type="hero").order_by("order").first()
    if hero and not (hero.content or {}).get("cards"):
        hero.content = {**(hero.content or {}), "cards": DEFAULT_CARDS}
        hero.save(update_fields=["content"])


def noop(apps, schema_editor):
    """Pas de retour arrière (on ne retire pas les cartes éditées)."""


class Migration(migrations.Migration):
    dependencies = [
        ("content", "0005_remove_accueil_contact_form"),
    ]
    operations = [migrations.RunPython(seed_hero_cards, noop)]
