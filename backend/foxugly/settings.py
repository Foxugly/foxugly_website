"""
Configuration Django pour le site foxugly.
Backend headless : sert une API REST consommée par le frontend Angular.
"""
import os
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# --- Sécurité ---------------------------------------------------------------
# Défauts « fail-safe » : DEBUG=False par défaut (à activer explicitement en dev
# via DEBUG=True), et jamais la clé de dev prévisible en production.
DEBUG = os.environ.get("DEBUG", "False").lower() == "true"
_RUNNING_TESTS = "test" in sys.argv

SECRET_KEY = os.environ.get("SECRET_KEY")
if not SECRET_KEY:
    if DEBUG or _RUNNING_TESTS:
        SECRET_KEY = "dev-insecure-change-me-in-production"
    else:
        # Production sans clé explicite : on en génère une aléatoire (jamais
        # prévisible) plutôt que de tourner sur une valeur connue. Les sessions
        # sont invalidées à chaque redémarrage tant que SECRET_KEY n'est
        # pas défini → à corriger en priorité (voir warning ci-dessous).
        import secrets
        import warnings

        SECRET_KEY = secrets.token_urlsafe(64)
        warnings.warn(
            "SECRET_KEY non défini en production : clé aléatoire générée. "
            "Définissez SECRET_KEY pour des sessions stables.",
            RuntimeWarning,
            stacklevel=2,
        )

ALLOWED_HOSTS = os.environ.get("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")

# --- Applications -----------------------------------------------------------
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Tiers
    "rest_framework",
    "corsheaders",
    # Local
    "content",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    # Sert les fichiers statiques de Django (admin, DRF) en production.
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "foxugly.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "foxugly.wsgi.application"

# --- Base de données --------------------------------------------------------
# Pilotée par l'environnement. SQLite par défaut ; PostgreSQL si
# DB_ENGINE=postgresql (nécessite psycopg, voir requirements.txt).
_DB_ENGINE = os.environ.get("DB_ENGINE", "sqlite3").lower()
if _DB_ENGINE in ("postgresql", "postgres", "psql"):
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.environ.get("DB_NAME", "foxugly"),
            "USER": os.environ.get("DB_USER", "foxugly"),
            "PASSWORD": os.environ.get("DB_PASSWORD", ""),
            "HOST": os.environ.get("DB_HOST", "127.0.0.1"),
            "PORT": os.environ.get("DB_PORT", "5432"),
            "CONN_MAX_AGE": int(os.environ.get("DB_CONN_MAX_AGE", "60")),
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": os.environ.get("DB_NAME", str(BASE_DIR / "db.sqlite3")),
        }
    }

# --- Validation des mots de passe ------------------------------------------
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# --- Internationalisation ---------------------------------------------------
LANGUAGE_CODE = "fr-fr"
TIME_ZONE = "Europe/Paris"
USE_I18N = True
USE_TZ = True

# --- Journalisation ---------------------------------------------------------
# Config explicite : tout part sur la sortie standard (captée par gunicorn →
# journald/systemd en prod, et visible en console en dev). Les logger.exception()
# des vues (envoi email, healthcheck DB…) deviennent ainsi réellement traçables.
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "standard": {"format": "%(asctime)s %(levelname)s %(name)s %(message)s"},
    },
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "standard"},
    },
    "root": {"handlers": ["console"], "level": os.environ.get("LOG_LEVEL", "INFO")},
    "loggers": {
        # Bruit des requêtes serveur réduit (les erreurs 5xx restent loggées par
        # django.request) ; notre app et django au niveau configurable.
        "django": {"level": "INFO", "handlers": ["console"], "propagate": False},
        "content": {"level": "INFO", "handlers": ["console"], "propagate": False},
    },
}

# --- Fichiers statiques & médias -------------------------------------------
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

# WhiteNoise : statics compressés + cache-busting en production.
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- Django REST Framework --------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_PERMISSION_CLASSES": [
        # Lecture publique, écriture réservée au staff (admin connecté).
        "content.permissions.IsAdminOrReadOnly",
    ],
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 50,
    # Limites de débit appliquées seulement aux vues qui le demandent
    # (ScopedRateThrottle + throttle_scope) : endpoints publics non authentifiés
    # qui écrivent en base et/ou envoient un email (contact, magic-link) → anti-spam.
    # NB : le cache par défaut (LocMemCache) est par-process ; avec plusieurs workers
    # gunicorn la limite effective est multipliée par le nombre de workers. Pour une
    # limite stricte et partagée, configurer un cache commun (Redis ou DatabaseCache).
    "DEFAULT_THROTTLE_RATES": {
        "contact": os.environ.get("THROTTLE_CONTACT", "5/min"),
        "magic_link": os.environ.get("THROTTLE_MAGIC_LINK", "5/min"),
    },
}

# --- CORS (frontend Angular) ------------------------------------------------
# Origines autorisées à appeler l'API. Ajuster selon ton port Angular (4200).
CORS_ALLOWED_ORIGINS = os.environ.get(
    "CORS_ORIGINS",
    "http://localhost:4200,http://127.0.0.1:4200",
).split(",")
CORS_ALLOW_CREDENTIALS = True

# Origines de confiance pour CSRF (Django 4+ vérifie l'en-tête Origin sur les
# requêtes d'écriture). Le frontend Angular (dev) appelle via proxy depuis
# localhost:4200, c'est cette origine qui arrive dans l'en-tête Origin.
CSRF_TRUSTED_ORIGINS = os.environ.get(
    "CSRF_TRUSTED_ORIGINS",
    "http://localhost:4200,http://127.0.0.1:4200",
).split(",")

# --- Sécurité en production (HTTPS derrière nginx) ----------------------------
# Activé via SECURE=True une fois le TLS en place sur le reverse proxy.
if os.environ.get("SECURE", "False") == "True":
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_SSL_REDIRECT = os.environ.get("SSL_REDIRECT", "True") == "True"
    SECURE_HSTS_SECONDS = int(os.environ.get("HSTS_SECONDS", "0"))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_CONTENT_TYPE_NOSNIFF = True

# --- Sentry (monitoring d'erreurs) ------------------------------------------
# Activé uniquement si SENTRY_DSN est défini (no-op en local / sans DSN).
SENTRY_DSN = os.environ.get("SENTRY_DSN", "")


def _sentry_release():
    """Identifie la version déployée pour corréler une erreur Sentry à un commit.

    Priorité à SENTRY_RELEASE (env), sinon le fichier RELEASE écrit dans le bundle
    par la CI (contient le SHA du commit). None si rien → Sentry ne tague pas.
    """
    env = os.environ.get("SENTRY_RELEASE")
    if env:
        return env
    try:
        return (BASE_DIR / "RELEASE").read_text(encoding="utf-8").strip() or None
    except OSError:
        return None


if SENTRY_DSN:
    import sentry_sdk

    sentry_sdk.init(
        dsn=SENTRY_DSN,
        environment=os.environ.get("SENTRY_ENV", "production"),
        release=_sentry_release(),
        # Tracing désactivé par défaut (0.0) ; monter si besoin de perf monitoring.
        traces_sample_rate=float(os.environ.get("SENTRY_TRACES_SAMPLE_RATE", "0.0")),
        send_default_pii=False,
    )
