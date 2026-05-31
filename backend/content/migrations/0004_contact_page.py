"""Crée la page /contact (avec formulaire + coordonnées) si elle n'existe pas,
et remplit des coordonnées par défaut si vides. Idempotent et non destructif :
ne touche à rien si la page existe déjà ou si les réglages sont renseignés.
"""
from django.db import migrations


def create_contact_page(apps, schema_editor):
    Page = apps.get_model("content", "Page")
    Block = apps.get_model("content", "Block")
    SiteSettings = apps.get_model("content", "SiteSettings")

    if not Page.objects.filter(slug="contact").exists():
        contact = Page.objects.create(
            slug="contact", title="Me contacter", nav_label="Me contacter",
            order=6, show_in_nav=False,
        )
        Block.objects.create(page=contact, block_type="page_hero", order=1, content={
            "badge": "Contact", "title": "Me contacter",
            "text": "Parlons de votre contexte. Un premier échange de 30 minutes, sans engagement."})
        Block.objects.create(page=contact, block_type="contact_form", order=2, content={
            "eyebrow": "Écrivez-moi", "title": "Votre message",
            "lead": "Décrivez votre besoin, je vous réponds rapidement."})
        Block.objects.create(page=contact, block_type="contact_info", order=3, content={
            "eyebrow": "Coordonnées", "title": "Informations"})

    # Coordonnées par défaut si le singleton existe mais n'a rien (à éditer ensuite).
    s = SiteSettings.objects.filter(pk=1).first()
    if s and not s.address:
        s.address = "Rue de l'Exemple 1\n1000 Bruxelles\nBelgique"
        s.phone = s.phone or "+32 4XX XX XX XX"
        s.vat_number = s.vat_number or "BE 0123.456.789"
        s.bank_account = s.bank_account or "BE00 0000 0000 0000"
        s.save()


def noop(apps, schema_editor):
    """Pas de retour arrière (on ne supprime pas le contenu)."""


class Migration(migrations.Migration):
    dependencies = [
        ("content", "0003_sitesettings_address_sitesettings_bank_account_and_more"),
    ]
    operations = [migrations.RunPython(create_contact_page, noop)]
