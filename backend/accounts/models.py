"""Modèle utilisateur email-only (sans username).

Swap mi-projet de ``auth.User`` vers ``accounts.User`` : on conserve l'id et le
hash de mot de passe de l'utilisateur existant (voir la migration de copie dans
``0001_initial``). Motif canonique de la flotte (cf. QuizOnline / trainingmanager,
OPERATIONS.md §3.16) : l'email est le ``USERNAME_FIELD``, il n'y a plus de colonne
``username``.
"""
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils.translation import gettext_lazy as _


class UserManager(BaseUserManager):
    """Manager utilisateur basé sur l'email (pas de username).

    Reproduit le contrat du ``UserManager`` standard de Django mais clé sur
    l'email au lieu du username.
    """

    use_in_migrations = True

    def create_user(self, email, password=None, **extra_fields):
        """Crée et enregistre un utilisateur avec l'email et le mot de passe donnés."""
        if not email:
            raise ValueError("L'adresse email est obligatoire.")

        extra_fields.setdefault("is_superuser", False)
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_active", True)

        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        """Crée un superutilisateur. is_staff et is_superuser sont forcés à True."""
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Un superutilisateur doit avoir is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Un superutilisateur doit avoir is_superuser=True.")

        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    # Auth email-only : on retire complètement username, on clé sur l'email
    # (motif canonique de la flotte, OPERATIONS.md §3.16). USERNAME_FIELD ci-dessous.
    username = None
    email = models.EmailField(_("email address"), unique=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    EMAIL_FIELD = "email"
    REQUIRED_FIELDS = []

    def __str__(self):
        return self.email
