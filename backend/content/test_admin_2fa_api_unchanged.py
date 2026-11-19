"""La 2FA de l'admin Django (admin_2fa/) ne change rien pour l'API, staff compris.

Le back-office Angular (/admin/*, SPA) s'authentifie par session DRF (mot de passe
ou magic link) : un staff, enrôlé en 2FA ou non, doit toujours pouvoir écrire via
/api/ sans second facteur. Seul /django-admin/ exige le code TOTP.
"""
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django_otp.plugins.otp_totp.models import TOTPDevice
from rest_framework.test import APITestCase

from .models import Page

User = get_user_model()
PASSWORD = "sup3rSecret!"


class AdminTwoFactorLeavesTheApiAloneTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.staff = User.objects.create_user("ops@example.com", password=PASSWORD, is_staff=True)
        self.page = Page.objects.create(slug="accueil", title="Accueil", order=1)

    def _staff_session_writes(self):
        me = self.client.get("/api/auth/me/")
        self.assertEqual(me.status_code, 200)
        self.assertTrue(me.data["is_authenticated"])
        r = self.client.patch(
            f"/api/pages/{self.page.slug}/", {"title": "Accueil modifié"}, format="json"
        )
        self.assertEqual(r.status_code, 200)
        self.page.refresh_from_db()
        self.assertEqual(self.page.title, "Accueil modifié")
        # ... while the Django admin still wants the second factor.
        self.assertEqual(self.client.get("/django-admin/").status_code, 302)

    def test_password_login_then_api_write(self):
        for enrolled in (False, True):
            with self.subTest(enrolled=enrolled):
                cache.clear()
                TOTPDevice.objects.filter(user=self.staff).delete()
                if enrolled:
                    TOTPDevice.objects.create(user=self.staff, name="admin-2fa", confirmed=True)
                self.client.logout()
                login = self.client.post(
                    "/api/auth/login/",
                    {"email": "ops@example.com", "password": PASSWORD},
                    format="json",
                )
                self.assertEqual(login.status_code, 200)
                self._staff_session_writes()

    def test_magic_link_login_then_api_write(self):
        from .views import make_magic_token

        TOTPDevice.objects.create(user=self.staff, name="admin-2fa", confirmed=True)
        r = self.client.post(
            "/api/auth/magic-login/", {"token": make_magic_token(self.staff)}, format="json"
        )
        self.assertEqual(r.status_code, 200)
        self._staff_session_writes()

    def test_health_stays_public(self):
        self.assertEqual(self.client.get("/health/").status_code, 200)
