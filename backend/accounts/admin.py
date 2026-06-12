from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.translation import gettext_lazy as _

from accounts.forms import UserChangeForm_, UserCreationForm_
from accounts.models import User


@admin.register(User)
class UserAdmin(UserAdmin):
    """UserAdmin email-only. Le UserAdmin standard de Django est câblé sur
    ``username`` dans list_display / search_fields / ordering / fieldsets /
    add_fieldsets — chaque référence est re-pointée sur ``email`` (le
    USERNAME_FIELD) ici."""

    form = UserChangeForm_
    add_form = UserCreationForm_
    model = User
    list_display = ("email", "first_name", "last_name", "is_staff", "is_superuser", "is_active")
    list_filter = ("is_staff", "is_superuser", "is_active")
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        (_("Personal info"), {"fields": ("first_name", "last_name")}),
        (_("Permissions"), {
            "fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions"),
        }),
        (_("Important dates"), {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("email", "password1", "password2"),
        }),
    )
    search_fields = ("email", "first_name", "last_name")
    ordering = ("email",)
