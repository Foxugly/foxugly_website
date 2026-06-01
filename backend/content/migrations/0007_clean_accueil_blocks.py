"""Nettoie la page accueil : retire le bloc `page_hero` (réservé aux pages
secondaires) et les doublons de type apparus via des essais d'édition. Garde
la première occurrence de chaque type, dans l'ordre. Idempotent.

Cible UNIQUEMENT la page accueil (les autres pages peuvent légitimement
répéter un type de bloc).
"""
from django.db import migrations


def clean_accueil(apps, schema_editor):
    Block = apps.get_model("content", "Block")
    seen = set()
    for block in list(Block.objects.filter(page__slug="accueil").order_by("order", "id")):
        # page_hero n'a rien à faire sur l'accueil ; sinon on retire les doublons
        # de type (on conserve la première occurrence rencontrée).
        if block.block_type == "page_hero" or block.block_type in seen:
            block.delete()
        else:
            seen.add(block.block_type)


def noop(apps, schema_editor):
    """Pas de retour arrière (on ne recrée pas les blocs supprimés)."""


class Migration(migrations.Migration):
    dependencies = [
        ("content", "0006_hero_cards_editable"),
    ]
    operations = [migrations.RunPython(clean_accueil, noop)]
