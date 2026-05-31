"""
Admin Django — back-office de secours et source de vérité du contenu.

L'admin Angular sur-mesure consommera la même API, mais cet admin reste
disponible immédiatement pour gérer pages, blocs et collections.
"""
from django.contrib import admin

from .models import (
    Block,
    News,
    Page,
    Partner,
    Project,
    SiteSettings,
    Testimonial,
)


class BlockInline(admin.StackedInline):
    model = Block
    extra = 0
    fields = ("order", "block_type", "is_visible", "anchor", "content")
    ordering = ("order",)
    classes = ("collapse",)


@admin.register(Page)
class PageAdmin(admin.ModelAdmin):
    list_display = ("title", "slug", "order", "show_in_nav", "is_published")
    list_editable = ("order", "show_in_nav", "is_published")
    prepopulated_fields = {"slug": ("title",)}
    inlines = [BlockInline]
    search_fields = ("title", "slug")


@admin.register(Block)
class BlockAdmin(admin.ModelAdmin):
    list_display = ("page", "block_type", "order", "is_visible")
    list_editable = ("order", "is_visible")
    list_filter = ("block_type", "is_visible", "page")
    ordering = ("page", "order")


@admin.register(News)
class NewsAdmin(admin.ModelAdmin):
    list_display = ("title", "category", "date", "order", "is_published")
    list_editable = ("order", "is_published")
    list_filter = ("category", "is_published")
    prepopulated_fields = {"slug": ("title",)}
    search_fields = ("title", "excerpt", "body")


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("title", "sector", "result", "order", "is_published")
    list_editable = ("order", "is_published")
    list_filter = ("sector", "is_published")
    search_fields = ("title", "description")


@admin.register(Partner)
class PartnerAdmin(admin.ModelAdmin):
    list_display = ("name", "kind", "sector_or_cause", "support_type", "order", "is_published")
    list_editable = ("order", "is_published")
    list_filter = ("kind", "is_published")
    search_fields = ("name", "sector_or_cause", "description")


@admin.register(Testimonial)
class TestimonialAdmin(admin.ModelAdmin):
    list_display = ("author", "role", "order", "is_published")
    list_editable = ("order", "is_published")
    search_fields = ("author", "quote")


@admin.register(SiteSettings)
class SiteSettingsAdmin(admin.ModelAdmin):
    list_display = ("brand_name", "contact_email")

    def has_add_permission(self, request):
        # Singleton : on n'autorise qu'un seul enregistrement.
        return not SiteSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False
