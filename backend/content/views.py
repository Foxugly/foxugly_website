"""Vues API. Lecture publique, écriture réservée aux utilisateurs connectés."""
from django.contrib.auth import authenticate, login, logout
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Block,
    News,
    Page,
    Partner,
    Project,
    SiteSettings,
    Testimonial,
)
from .serializers import (
    BlockSerializer,
    NewsSerializer,
    PageDetailSerializer,
    PageSerializer,
    PartnerSerializer,
    ProjectSerializer,
    SiteSettingsSerializer,
    TestimonialSerializer,
)


class PageViewSet(viewsets.ModelViewSet):
    """Pages et leurs blocs. Recherche par slug (ex : /api/pages/accueil/)."""

    queryset = Page.objects.all().order_by("order", "id")
    lookup_field = "slug"

    def get_serializer_class(self):
        if self.action in ("retrieve", "create", "update", "partial_update"):
            return PageDetailSerializer
        return PageSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        # Le public ne voit que les pages publiées ; l'admin voit tout.
        if not self.request.user.is_staff:
            qs = qs.filter(is_published=True)
        return qs


class BlockViewSet(viewsets.ModelViewSet):
    """CRUD des blocs (utilisé par l'éditeur de l'admin Angular)."""

    queryset = Block.objects.all().order_by("page", "order", "id")
    serializer_class = BlockSerializer
    # Pas de pagination : le param `?page=<slug>` filtre par page (il entrerait
    # sinon en collision avec le `page` de la pagination DRF) et les listes de
    # blocs sont courtes.
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset()
        page_slug = self.request.query_params.get("page")
        if page_slug:
            qs = qs.filter(page__slug=page_slug)
        return qs

    @action(detail=False, methods=["post"])
    def reorder(self, request):
        """Réordonne une liste de blocs : body = [{id, order}, ...]."""
        items = request.data if isinstance(request.data, list) else []
        try:
            cleaned = [(int(it["id"]), int(it["order"])) for it in items]
        except (KeyError, TypeError, ValueError):
            return Response(
                {"detail": "Format attendu : [{id, order}, …] avec des entiers."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        for pk, order in cleaned:
            Block.objects.filter(pk=pk).update(order=order)
        return Response({"status": "ok"})


class NewsViewSet(viewsets.ModelViewSet):
    serializer_class = NewsSerializer
    queryset = News.objects.all()

    def get_queryset(self):
        qs = super().get_queryset()
        if not self.request.user.is_staff:
            qs = qs.filter(is_published=True)
        return qs


class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    queryset = Project.objects.all()

    def get_queryset(self):
        qs = super().get_queryset()
        sector = self.request.query_params.get("sector")
        if sector:
            qs = qs.filter(sector__iexact=sector)
        if not self.request.user.is_staff:
            qs = qs.filter(is_published=True)
        return qs


class PartnerViewSet(viewsets.ModelViewSet):
    serializer_class = PartnerSerializer
    queryset = Partner.objects.all()

    def get_queryset(self):
        qs = super().get_queryset()
        kind = self.request.query_params.get("kind")
        if kind:
            qs = qs.filter(kind=kind)
        if not self.request.user.is_staff:
            qs = qs.filter(is_published=True)
        return qs

    @action(detail=True, methods=["post"])
    def clear_logo(self, request, pk=None):
        """Supprime le logo (fichier + champ) d'un partenaire. Réservé à l'admin."""
        if not request.user.is_staff:
            return Response(status=status.HTTP_403_FORBIDDEN)
        partner = self.get_object()
        if partner.logo:
            partner.logo.delete(save=True)
        serializer = self.get_serializer(partner)
        return Response(serializer.data)


class TestimonialViewSet(viewsets.ModelViewSet):
    serializer_class = TestimonialSerializer
    queryset = Testimonial.objects.all()

    def get_queryset(self):
        qs = super().get_queryset()
        if not self.request.user.is_staff:
            qs = qs.filter(is_published=True)
        return qs


class SiteSettingsView(APIView):
    """Réglages globaux (singleton) : /api/settings/. Édition réservée à l'admin."""

    def get(self, request):
        settings_obj, _ = SiteSettings.objects.get_or_create(pk=1)
        return Response(SiteSettingsSerializer(settings_obj).data)

    def put(self, request):
        if not request.user.is_staff:
            return Response(status=status.HTTP_403_FORBIDDEN)
        settings_obj, _ = SiteSettings.objects.get_or_create(pk=1)
        serializer = SiteSettingsSerializer(settings_obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


# ---------------------------------------------------------------------------
# Authentification de session pour l'admin Angular
# ---------------------------------------------------------------------------
def _user_payload(user):
    return {
        "is_authenticated": user.is_authenticated,
        "username": user.username if user.is_authenticated else None,
        "is_staff": bool(getattr(user, "is_staff", False)),
    }


@method_decorator(ensure_csrf_cookie, name="dispatch")
class AuthMeView(APIView):
    """État de connexion. Pose aussi le cookie CSRF (csrftoken) pour le SPA."""

    permission_classes = [AllowAny]

    def get(self, request):
        return Response(_user_payload(request.user))


class LoginView(APIView):
    """Connexion par session DRF : POST {username, password}."""

    permission_classes = [AllowAny]

    def post(self, request):
        user = authenticate(
            request,
            username=request.data.get("username"),
            password=request.data.get("password"),
        )
        if user is None or not user.is_staff:
            return Response(
                {"detail": "Identifiants invalides ou compte non autorisé."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        login(request, user)
        return Response(_user_payload(user))


class LogoutView(APIView):
    """Déconnexion : POST. Accessible à tous (no-op si non connecté)."""

    permission_classes = [AllowAny]

    def post(self, request):
        logout(request)
        return Response({"detail": "Déconnecté."})
