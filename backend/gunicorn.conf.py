"""Configuration Gunicorn pour foxugly (production).

Lancement : gunicorn -c gunicorn.conf.py foxugly.wsgi:application
(géré par systemd, voir deploy/foxugly.service).
"""
import multiprocessing
import os

# Écoute en local ; nginx fait le frontal (TLS + statics + frontend).
bind = os.environ.get("GUNICORN_BIND", "127.0.0.1:8000")

# 2*cpu+1 par défaut, surchargé via env si besoin.
workers = int(os.environ.get("GUNICORN_WORKERS", multiprocessing.cpu_count() * 2 + 1))
timeout = int(os.environ.get("GUNICORN_TIMEOUT", "60"))

accesslog = "-"   # vers journald via systemd
errorlog = "-"
loglevel = os.environ.get("GUNICORN_LOGLEVEL", "info")
