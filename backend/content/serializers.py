"""Sérialiseurs DRF : exposent le contenu au frontend Angular."""
from rest_framework import serializers

from .models import (
    Block,
    ContactMessage,
    News,
    Page,
    Partner,
    Project,
    SiteSettings,
    Testimonial,
)


class BlockSerializer(serializers.ModelSerializer):
    block_type_display = serializers.CharField(
        source="get_block_type_display", read_only=True
    )

    class Meta:
        model = Block
        fields = [
            "id", "page", "block_type", "block_type_display", "order",
            "is_visible", "anchor", "content",
        ]


class PageSerializer(serializers.ModelSerializer):
    """Page « légère » pour la navigation (sans les blocs)."""

    class Meta:
        model = Page
        fields = [
            "id", "slug", "title", "nav_label", "order",
            "show_in_nav", "is_published",
        ]


class PageDetailSerializer(serializers.ModelSerializer):
    """Page complète avec ses blocs visibles, ordonnés."""

    blocks = serializers.SerializerMethodField()

    class Meta:
        model = Page
        fields = [
            "id", "slug", "title", "nav_label", "order", "show_in_nav",
            "is_published", "seo_title", "seo_description", "blocks",
        ]

    def get_blocks(self, obj):
        # Utilise le prefetch `visible_blocks` (PageViewSet.retrieve) s'il existe,
        # sinon requête directe (création/màj, ou usage hors de ce viewset).
        blocks = getattr(obj, "visible_blocks", None)
        if blocks is None:
            blocks = obj.blocks.filter(is_visible=True).order_by("order", "id")
        return BlockSerializer(blocks, many=True).data


class NewsSerializer(serializers.ModelSerializer):
    class Meta:
        model = News
        fields = [
            "id", "title", "slug", "category", "excerpt", "body",
            "date", "read_time", "order", "is_published",
        ]


class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ["id", "title", "sector", "description", "result", "order", "is_published"]


class PartnerSerializer(serializers.ModelSerializer):
    kind_display = serializers.CharField(source="get_kind_display", read_only=True)

    class Meta:
        model = Partner
        fields = [
            "id", "name", "kind", "kind_display", "sector_or_cause",
            "description", "support_type", "link", "logo", "order", "is_published",
        ]


class TestimonialSerializer(serializers.ModelSerializer):
    class Meta:
        model = Testimonial
        fields = ["id", "quote", "author", "role", "initials", "order", "is_published"]


class ContactMessageSerializer(serializers.ModelSerializer):
    # Force une vraie validation d'email et des champs requis non vides.
    email = serializers.EmailField()
    name = serializers.CharField(max_length=200)
    message = serializers.CharField()
    subject = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = ContactMessage
        fields = ["name", "email", "subject", "message"]


class SiteSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteSettings
        fields = [
            "brand_name", "tagline", "contact_email", "phone", "address",
            "vat_number", "bank_account", "linkedin_url", "footer_text",
        ]
