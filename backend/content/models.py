"""
Modèle de contenu du site foxugly.

Principe « page builder » : chaque page est composée de BLOCS ordonnables et
typés. Le contenu textuel de chaque bloc est stocké dans un champ JSON, ce qui
permet d'ajouter, réordonner, masquer et éditer n'importe quel texte depuis
l'admin — et, plus tard, depuis un éditeur visuel (GrapesJS) côté Angular.

Les collections (actualités, projets, clients/associations, témoignages) sont
des modèles dédiés : un bloc de type liste y fait référence pour les afficher.
"""
from django.db import models


# ---------------------------------------------------------------------------
# Réglages globaux (singleton)
# ---------------------------------------------------------------------------
class SiteSettings(models.Model):
    """Textes et coordonnées partagés par tout le site (un seul enregistrement)."""

    brand_name = models.CharField("Nom de marque", max_length=80, default="foxugly")
    tagline = models.CharField("Accroche", max_length=200, blank=True,
                               default="Coaching agile indépendant")
    contact_email = models.EmailField("Email de contact", default="contact@foxugly.com")
    phone = models.CharField("Téléphone", max_length=40, blank=True)
    address = models.TextField("Adresse", blank=True)
    vat_number = models.CharField("Numéro de TVA", max_length=40, blank=True)
    bank_account = models.CharField("Numéro de compte (IBAN)", max_length=60, blank=True)
    linkedin_url = models.URLField("LinkedIn", blank=True)
    footer_text = models.TextField(
        "Texte du pied de page", blank=True,
        default="Coaching agile indépendant. J'aide vos équipes à livrer de la "
                "valeur, plus vite et plus sereinement.",
    )

    class Meta:
        verbose_name = "Réglages du site"
        verbose_name_plural = "Réglages du site"

    def __str__(self):
        return "Réglages du site"

    def save(self, *args, **kwargs):
        # Force un identifiant unique : il n'existe qu'un seul réglage.
        self.pk = 1
        super().save(*args, **kwargs)


# ---------------------------------------------------------------------------
# Pages et blocs
# ---------------------------------------------------------------------------
class Page(models.Model):
    slug = models.SlugField("Identifiant URL", unique=True,
                            help_text="ex : accueil, qui-suis-je, agilite")
    title = models.CharField("Titre", max_length=150)
    nav_label = models.CharField("Libellé menu", max_length=60, blank=True)
    order = models.PositiveIntegerField("Ordre", default=0)
    show_in_nav = models.BooleanField("Afficher dans le menu", default=True)
    is_published = models.BooleanField("Publiée", default=True)
    seo_title = models.CharField("Titre SEO", max_length=200, blank=True)
    seo_description = models.CharField("Description SEO", max_length=300, blank=True)

    class Meta:
        verbose_name = "Page"
        verbose_name_plural = "Pages"
        ordering = ["order", "id"]

    def __str__(self):
        return self.title


class Block(models.Model):
    """Un bloc de contenu typé et ordonnable au sein d'une page."""

    class Type(models.TextChoices):
        HERO = "hero", "Hero (accueil)"
        PAGE_HERO = "page_hero", "En-tête de page"
        RICHTEXT = "richtext", "Texte enrichi"
        STATS = "stats", "Chiffres clés"
        CARDS = "cards", "Cartes (services / valeurs)"
        TIMELINE = "timeline", "Frise chronologique"
        ACCORDION = "accordion", "Accordéon"
        TESTIMONIALS = "testimonials", "Témoignages"
        LOGO_WALL = "logo_wall", "Mur de logos"
        NEWS_LIST = "news_list", "Liste d'actualités"
        PROJECT_LIST = "project_list", "Liste de projets"
        PARTNER_LIST = "partner_list", "Liste clients / associations"
        CTA = "cta", "Appel à l'action"
        CONTACT_FORM = "contact_form", "Formulaire de contact"
        CONTACT_INFO = "contact_info", "Coordonnées (adresse, TVA, compte…)"

    page = models.ForeignKey(Page, related_name="blocks", on_delete=models.CASCADE)
    block_type = models.CharField("Type de bloc", max_length=30, choices=Type.choices)
    order = models.PositiveIntegerField("Ordre", default=0)
    is_visible = models.BooleanField("Visible", default=True)
    anchor = models.SlugField("Ancre (#)", blank=True,
                              help_text="Optionnel, pour les liens internes (ex : contact)")
    # Tout le contenu éditable du bloc : titres, textes, items, réglages.
    content = models.JSONField("Contenu", default=dict, blank=True)

    class Meta:
        verbose_name = "Bloc"
        verbose_name_plural = "Blocs"
        ordering = ["page", "order", "id"]
        # Index composite pour la récupération ordonnée des blocs d'une page
        # (PageViewSet.retrieve préchargé `blocks` filtré/ordonné par page+order,
        # BlockViewSet `?page=<slug>` ordonné par page+order).
        indexes = [models.Index(fields=["page", "order"])]

    def __str__(self):
        return f"{self.page.slug} · {self.get_block_type_display()} (#{self.order})"


# ---------------------------------------------------------------------------
# Collections
# ---------------------------------------------------------------------------
class News(models.Model):
    title = models.CharField("Titre", max_length=200)
    slug = models.SlugField("Identifiant URL", unique=True)
    category = models.CharField("Catégorie", max_length=60, blank=True,
                                help_text="ex : Article, Événement, Atelier")
    excerpt = models.TextField("Résumé", blank=True)
    body = models.TextField("Contenu", blank=True)
    date = models.DateField("Date de publication", null=True, blank=True)
    read_time = models.CharField("Temps de lecture", max_length=30, blank=True)
    is_published = models.BooleanField("Publiée", default=True)
    order = models.PositiveIntegerField("Ordre", default=0)

    class Meta:
        verbose_name = "Actualité"
        verbose_name_plural = "Actualités"
        ordering = ["order", "-date", "id"]

    def __str__(self):
        return self.title


class Project(models.Model):
    title = models.CharField("Titre", max_length=200)
    sector = models.CharField("Secteur", max_length=80, blank=True,
                              help_text="ex : Banque, Retail, Santé, Public, Tech / SaaS")
    description = models.TextField("Description", blank=True)
    result = models.CharField("Résultat clé", max_length=160, blank=True,
                              help_text="ex : Lead-time −60 %")
    is_published = models.BooleanField("Publié", default=True)
    order = models.PositiveIntegerField("Ordre", default=0)

    class Meta:
        verbose_name = "Projet"
        verbose_name_plural = "Projets"
        ordering = ["order", "id"]

    def __str__(self):
        return self.title


class Partner(models.Model):
    class Kind(models.TextChoices):
        CLIENT = "client", "Client"
        ASSOCIATION = "association", "Association"

    name = models.CharField("Nom", max_length=120)
    kind = models.CharField("Type", max_length=20, choices=Kind.choices, default=Kind.CLIENT)
    sector_or_cause = models.CharField("Secteur / cause", max_length=120, blank=True)
    description = models.TextField("Description / type de soutien", blank=True)
    support_type = models.CharField("Forme de soutien", max_length=80, blank=True,
                                    help_text="Associations : Sponsoring, Mécénat de compétences, Don…")
    link = models.URLField("Lien", blank=True)
    logo = models.ImageField("Logo", upload_to="partners/", null=True, blank=True)
    is_published = models.BooleanField("Publié", default=True)
    order = models.PositiveIntegerField("Ordre", default=0)

    class Meta:
        verbose_name = "Client / Association"
        verbose_name_plural = "Clients & Associations"
        ordering = ["kind", "order", "id"]

    def __str__(self):
        return f"{self.name} ({self.get_kind_display()})"


class Testimonial(models.Model):
    quote = models.TextField("Citation")
    author = models.CharField("Auteur", max_length=120)
    role = models.CharField("Rôle / société", max_length=160, blank=True)
    initials = models.CharField("Initiales", max_length=4, blank=True)
    is_published = models.BooleanField("Publié", default=True)
    order = models.PositiveIntegerField("Ordre", default=0)

    class Meta:
        verbose_name = "Témoignage"
        verbose_name_plural = "Témoignages"
        ordering = ["order", "id"]

    def __str__(self):
        return f"{self.author} — {self.quote[:40]}…"


class ContactMessage(models.Model):
    """Message reçu via le formulaire de contact (stocké puis envoyé par email)."""

    name = models.CharField("Nom", max_length=120)
    email = models.EmailField("Email")
    subject = models.CharField("Sujet", max_length=200, blank=True)
    message = models.TextField("Message")
    created_at = models.DateTimeField("Reçu le", auto_now_add=True)
    sent = models.BooleanField("Email envoyé", default=False)
    error = models.TextField("Erreur d'envoi", blank=True)

    class Meta:
        verbose_name = "Message de contact"
        verbose_name_plural = "Messages de contact"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} <{self.email}>"
