"""Tests de l'API content : lectures publiques, permissions staff, auth, contact."""
from django.contrib.auth.models import User
from django.core import signing
from django.core.cache import cache
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Block, ContactMessage, News, Page, Partner, SiteSettings


class BaseAPITestCase(APITestCase):
    def setUp(self):
        # Le throttling DRF stocke son compteur dans le cache par défaut : on le
        # vide avant chaque test pour que les limites ne fuient pas d'un test à l'autre.
        cache.clear()
        self.staff = User.objects.create_user("staff", password="pw", is_staff=True)
        self.plain = User.objects.create_user("plain", password="pw", is_staff=False)
        self.page = Page.objects.create(slug="accueil", title="Accueil", order=1)
        self.hero = Block.objects.create(page=self.page, block_type=Block.Type.HERO, order=1,
                                         content={"title": "Bonjour"})
        self.hidden = Block.objects.create(page=self.page, block_type=Block.Type.CTA, order=2,
                                           is_visible=False, content={"title": "Caché"})
        self.partner = Partner.objects.create(name="Client A", kind=Partner.Kind.CLIENT, order=1)
        News.objects.create(title="News 1", slug="news-1", order=1)


class PublicReadTests(BaseAPITestCase):
    def test_pages_list_public(self):
        r = self.client.get("/api/pages/")
        self.assertEqual(r.status_code, 200)
        # La page "accueil" créée ici est publiée → présente dans la liste.
        # (count exact évité : du contenu baseline peut être ajouté par migration.)
        self.assertIn("accueil", [p["slug"] for p in r.data["results"]])

    def test_page_detail_only_visible_blocks(self):
        r = self.client.get("/api/pages/accueil/")
        self.assertEqual(r.status_code, 200)
        types = [b["block_type"] for b in r.data["blocks"]]
        self.assertEqual(types, ["hero"])  # le bloc caché est exclu

    def test_blocks_filter_by_page_not_paginated(self):
        r = self.client.get("/api/blocks/?page=accueil")
        self.assertEqual(r.status_code, 200)
        # pagination désactivée → liste brute (pas d'enveloppe {results})
        self.assertIsInstance(r.data, list)
        self.assertEqual(len(r.data), 2)

    def test_collections_and_settings_public(self):
        for path in ("/api/news/", "/api/projects/", "/api/partners/", "/api/testimonials/", "/api/settings/"):
            self.assertEqual(self.client.get(path).status_code, 200, path)


class HealthTests(APITestCase):
    def test_health_ok(self):
        r = self.client.get("/health")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["status"], "ok")

    def test_health_trailing_slash(self):
        self.assertEqual(self.client.get("/health/").status_code, 200)


class WritePermissionTests(BaseAPITestCase):
    """Écriture réservée au staff (IsAdminOrReadOnly)."""

    def test_anonymous_write_denied(self):
        self.assertEqual(self.client.post("/api/blocks/", {}, format="json").status_code, 403)
        self.assertEqual(self.client.post("/api/blocks/reorder/", [], format="json").status_code, 403)
        self.assertEqual(self.client.put("/api/settings/", {"brand_name": "x"}, format="json").status_code, 403)

    def test_non_staff_write_denied(self):
        self.client.force_authenticate(self.plain)
        self.assertEqual(self.client.post("/api/partners/", {"name": "x"}, format="json").status_code, 403)
        self.assertEqual(self.client.post("/api/blocks/reorder/", [], format="json").status_code, 403)

    def test_staff_can_write_and_reorder(self):
        self.client.force_authenticate(self.staff)
        r = self.client.post("/api/blocks/reorder/",
                             [{"id": self.hidden.id, "order": 1}, {"id": self.hero.id, "order": 2}],
                             format="json")
        self.assertEqual(r.status_code, 200)
        self.hero.refresh_from_db()
        self.assertEqual(self.hero.order, 2)

    def test_reorder_rejects_bad_payload(self):
        self.client.force_authenticate(self.staff)
        r = self.client.post("/api/blocks/reorder/", [{"id": "abc"}], format="json")
        self.assertEqual(r.status_code, 400)

    def test_staff_settings_update(self):
        self.client.force_authenticate(self.staff)
        r = self.client.put("/api/settings/", {"brand_name": "foxnew"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(SiteSettings.objects.get(pk=1).brand_name, "foxnew")

    def test_clear_logo_permission(self):
        url = f"/api/partners/{self.partner.id}/clear_logo/"
        self.assertEqual(self.client.post(url).status_code, 403)  # anonyme
        self.client.force_authenticate(self.staff)
        self.assertEqual(self.client.post(url).status_code, 200)  # staff, pas de logo → ok


class AuthTests(BaseAPITestCase):
    def test_login_logout_me(self):
        self.assertFalse(self.client.get("/api/auth/me/").data["is_authenticated"])
        r = self.client.post("/api/auth/login/", {"username": "staff", "password": "pw"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertTrue(self.client.get("/api/auth/me/").data["is_authenticated"])
        self.client.post("/api/auth/logout/")
        self.assertFalse(self.client.get("/api/auth/me/").data["is_authenticated"])

    def test_login_rejects_non_staff_and_bad_password(self):
        self.assertEqual(self.client.post("/api/auth/login/",
                         {"username": "plain", "password": "pw"}, format="json").status_code, 400)
        self.assertEqual(self.client.post("/api/auth/login/",
                         {"username": "staff", "password": "nope"}, format="json").status_code, 400)


class MagicLinkTests(BaseAPITestCase):
    def _token(self, user):
        return signing.dumps({"uid": user.pk, "ll": str(user.last_login)}, salt="foxugly.magic-login")

    def test_request_always_200(self):
        for email in (self.staff.email or "staff@x.com", "unknown@x.com"):
            self.assertEqual(
                self.client.post("/api/auth/magic-link/", {"email": email}, format="json").status_code, 200)

    def test_login_then_single_use(self):
        token = self._token(self.staff)
        r = self.client.post("/api/auth/magic-login/", {"token": token}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data["is_staff"])
        # réutilisation : last_login a changé → refus
        r2 = self.client.post("/api/auth/magic-login/", {"token": token}, format="json")
        self.assertEqual(r2.status_code, 400)

    def test_invalid_token(self):
        self.assertEqual(
            self.client.post("/api/auth/magic-login/", {"token": "bad"}, format="json").status_code, 400)

    def test_non_staff_token_refused(self):
        token = self._token(self.plain)  # encode un uid non-staff
        self.assertEqual(
            self.client.post("/api/auth/magic-login/", {"token": token}, format="json").status_code, 400)


class ContactTests(BaseAPITestCase):
    def test_contact_stores_message(self):
        r = self.client.post("/api/contact/",
                             {"name": "Jean", "email": "jean@x.com", "message": "Bonjour"}, format="json")
        self.assertEqual(r.status_code, 201)
        msg = ContactMessage.objects.get()
        self.assertEqual(msg.name, "Jean")
        self.assertFalse(msg.sent)  # Graph non configuré en test

    def test_contact_validates_required_fields(self):
        r = self.client.post("/api/contact/", {"name": "Jean"}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_contact_honeypot_silently_ignored(self):
        # Champ leurre rempli → réponse 201 identique, mais rien n'est stocké.
        r = self.client.post(
            "/api/contact/",
            {"name": "Bot", "email": "bot@x.com", "message": "spam", "website": "http://spam"},
            format="json",
        )
        self.assertEqual(r.status_code, 201)
        self.assertEqual(ContactMessage.objects.count(), 0)

    def test_contact_is_throttled(self):
        # 5/min : la 6e soumission consécutive est refusée (429).
        payload = {"name": "Jean", "email": "jean@x.com", "message": "Bonjour"}
        for _ in range(5):
            self.assertEqual(
                self.client.post("/api/contact/", payload, format="json").status_code, 201
            )
        r = self.client.post("/api/contact/", payload, format="json")
        self.assertEqual(r.status_code, status.HTTP_429_TOO_MANY_REQUESTS)


class ThrottleTests(BaseAPITestCase):
    def test_magic_link_is_throttled(self):
        # 5/min sur la demande de magic link (anti-flood de la boîte staff).
        for _ in range(5):
            self.assertEqual(
                self.client.post("/api/auth/magic-link/", {"email": "x@x.com"},
                                  format="json").status_code, 200
            )
        r = self.client.post("/api/auth/magic-link/", {"email": "x@x.com"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
