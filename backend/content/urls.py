"""Routes de l'API content."""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AuthMeView,
    BlockViewSet,
    ContactView,
    LoginView,
    LogoutView,
    MagicLinkLoginView,
    MagicLinkRequestView,
    NewsViewSet,
    PageViewSet,
    PartnerViewSet,
    ProjectViewSet,
    SiteSettingsView,
    TestimonialViewSet,
)

router = DefaultRouter()
router.register("pages", PageViewSet, basename="page")
router.register("blocks", BlockViewSet, basename="block")
router.register("news", NewsViewSet, basename="news")
router.register("projects", ProjectViewSet, basename="project")
router.register("partners", PartnerViewSet, basename="partner")
router.register("testimonials", TestimonialViewSet, basename="testimonial")

urlpatterns = [
    path("settings/", SiteSettingsView.as_view(), name="site-settings"),
    path("auth/login/", LoginView.as_view(), name="auth-login"),
    path("auth/logout/", LogoutView.as_view(), name="auth-logout"),
    path("auth/me/", AuthMeView.as_view(), name="auth-me"),
    path("auth/magic-link/", MagicLinkRequestView.as_view(), name="auth-magic-link"),
    path("auth/magic-login/", MagicLinkLoginView.as_view(), name="auth-magic-login"),
    path("contact/", ContactView.as_view(), name="contact"),
    path("", include(router.urls)),
]
