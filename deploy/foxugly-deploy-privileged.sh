#!/usr/bin/env bash
#
# Foxugly — PRIVILEGED deploy step (runs as ROOT).
#
# §3.10 / §3.11 (OPERATIONS.md, "the quizonline model"): root must never execute
# a script that lives in the django-writable tree, nor install a root-loaded
# artifact (systemd unit / nginx vhost) from a django-writable file. So the SSM
# pipeline:
#   1. extracts the trusted CI bundle as ROOT-owned (`tar --no-same-owner`),
#   2. installs THIS script to /usr/local/sbin (root:root 0755) from that bundle,
#   3. runs it from there — BEFORE the tree is chown'd to django.
# At that point the unit/nginx sources under deploy/ are still root-owned (just
# extracted), so installing them as root is safe. The app build (pip/migrate/
# collectstatic) and the final perms normalization run afterwards as django; the
# gunicorn restart runs as root in the pipeline after the build.
#
# Behaviour is otherwise identical to the previous (in-tree, root-run) deploy.sh.
set -euo pipefail
umask 027

APP=/var/www/django_websites/foxugly

# --- nginx vhost ---------------------------------------------------------------
# Vhost name = host of FRONTEND_BASE_URL, already fetched from SSM into
# /run/foxugly/.env by foxugly-env-fetch.service (we do NOT re-read SSM here).
# Fallback foxugly.com if absent.
SITE_URL=$(grep -m1 '^FRONTEND_BASE_URL=' /run/foxugly/.env 2>/dev/null | cut -d= -f2- || true)
DOMAIN="${SITE_URL#http://}"; DOMAIN="${DOMAIN#https://}"; DOMAIN="${DOMAIN%%/*}"
[ -n "$DOMAIN" ] || DOMAIN=foxugly.com

# Drop the apex/www variants before posting the one in use: two files both
# defining `upstream foxugly_app` → `nginx -t` emerg on a SITE_URL rename.
# (rm BEFORE cp/ln → no self-deletion even if DOMAIN is in the list.)
rm -f /etc/nginx/sites-enabled/foxugly.com     /etc/nginx/sites-available/foxugly.com \
      /etc/nginx/sites-enabled/www.foxugly.com /etc/nginx/sites-available/www.foxugly.com
cp "$APP/deploy/nginx.conf" "/etc/nginx/sites-available/${DOMAIN}"
ln -sf "/etc/nginx/sites-available/${DOMAIN}" "/etc/nginx/sites-enabled/${DOMAIN}"
if nginx -t; then
    systemctl reload nginx
else
    echo "✗ nginx -t a échoué : conf non rechargée." >&2
    exit 1
fi

# --- systemd units (idempotent: daemon-reload only on a real change) -----------
units_changed=0
for unit in foxugly-env-fetch.service foxugly-gunicorn.service; do
    if ! cmp -s "$APP/deploy/$unit" "/etc/systemd/system/$unit"; then
        cp "$APP/deploy/$unit" "/etc/systemd/system/$unit"
        units_changed=1
    fi
done
[ "$units_changed" = 1 ] && systemctl daemon-reload
systemctl enable foxugly-gunicorn        # persistance au boot (idempotent)

echo "✓ foxugly privileged step done (nginx vhost + systemd units)."
