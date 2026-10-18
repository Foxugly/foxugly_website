"""Routes racines du projet foxugly."""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path

from content.views import HealthView

urlpatterns = [
    # Admin Django hors de /admin/ : ce préfixe appartient au back-office Angular
    # (SPA), dont le magic link /admin/magic doit être servi par nginx → index.html.
    path("django-admin/", admin.site.urls),
    path("api/", include("content.urls")),
    # Sonde de santé pour le monitoring (avec ou sans slash final).
    re_path(r"^health/?$", HealthView.as_view(), name="health"),
]

if settings.DEBUG:
    # Login/logout de l'API navigable DRF : dev seulement (le SPA utilise /api/auth/).
    urlpatterns += [path("api-auth/", include("rest_framework.urls"))]
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
