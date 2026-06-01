"""Routes racines du projet foxugly."""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path

from content.views import HealthView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("content.urls")),
    # Authentification de session pour l'admin Angular (login/logout DRF).
    path("api-auth/", include("rest_framework.urls")),
    # Sonde de santé pour le monitoring (avec ou sans slash final).
    re_path(r"^health/?$", HealthView.as_view(), name="health"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
