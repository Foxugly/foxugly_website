"""Retire le bloc contact_form de la page accueil : le formulaire de contact
vit désormais uniquement sur la page /contact. Idempotent et ciblé (ne touche
qu'au type contact_form de la page accueil).
"""
from django.db import migrations


def remove_accueil_contact_form(apps, schema_editor):
    Block = apps.get_model("content", "Block")
    Block.objects.filter(page__slug="accueil", block_type="contact_form").delete()


def noop(apps, schema_editor):
    """Pas de retour arrière (on ne recrée pas le formulaire sur accueil)."""


class Migration(migrations.Migration):
    dependencies = [
        ("content", "0004_contact_page"),
    ]
    operations = [migrations.RunPython(remove_accueil_contact_form, noop)]
