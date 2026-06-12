from django.contrib.auth.forms import UserChangeForm, UserCreationForm

from accounts.models import User


class UserCreationForm_(UserCreationForm):
    """Formulaire de création email-only. Le UserCreationForm standard de Django
    est câblé sur ``username`` ; on surcharge Meta pour clé sur ``email``."""

    class Meta:
        model = User
        fields = ("email",)


class UserChangeForm_(UserChangeForm):
    class Meta:
        model = User
        fields = "__all__"
