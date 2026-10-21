#!/usr/bin/env bash
#
# Foxugly — PRIVILEGED deploy step (runs as ROOT).
#
# §3.10 / §3.11 (OPERATIONS.md, "the quizonline model"): root must never execute
# a script that lives in the django-writable tree, nor install a root-loaded
# artifact (systemd unit / nginx vhost) from a django-writable file, nor write
# into a django-owned directory. So the SSM pipeline:
#   1. has DJANGO extract the trusted CI bundle into its own tree (root only
#      downloads it into a private mktemp -d and hands it over on stdin),
#   2. installs THIS script to /usr/local/sbin (root:root 0755) from root's mirror,
#   3. runs it from there.
# The app build (pip/migrate/collectstatic) runs afterwards as django; the
# gunicorn restart runs as root in the pipeline after the build; the final perms
# normalization is `chown -R -h` (root, follows no link) + chmod as django.
#
# Behaviour is otherwise identical to the previous (in-tree, root-run) deploy.sh.
#
# Every file this script installs is read from ROOT'S OWN bare mirror (args:
# mirror git-dir + commit SHA, filled from GitHub by the SSM pipeline), never
# from the app tree: directories that already existed there stay django-owned
# after the extraction, so django could swap a file there before root reads it.
set -euo pipefail
umask 027

M="${1:?usage: $0 <root-mirror-git-dir> <sha>}"
SHA="${2:?usage: $0 <root-mirror-git-dir> <sha>}"
blob() { git --git-dir="$M" show "$SHA:$1"; }

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
blob deploy/nginx.conf > "/etc/nginx/sites-available/${DOMAIN}"
ln -sf "/etc/nginx/sites-available/${DOMAIN}" "/etc/nginx/sites-enabled/${DOMAIN}"
if nginx -t; then
    systemctl reload nginx
else
    echo "✗ nginx -t a échoué : conf non rechargée." >&2
    exit 1
fi

# --- systemd units (idempotent: daemon-reload only on a real change) -----------
units_changed=0
for unit in foxugly-env-fetch.service foxugly-gunicorn.service \n            foxugly-purge-contact.service foxugly-purge-contact.timer; do
    new_unit=$(mktemp)
    blob "deploy/$unit" > "$new_unit"
    if ! cmp -s "$new_unit" "/etc/systemd/system/$unit"; then
        install -o root -g root -m 0644 "$new_unit" "/etc/systemd/system/$unit"
        units_changed=1
    fi
    rm -f "$new_unit"
done
[ "$units_changed" = 1 ] && systemctl daemon-reload
systemctl enable foxugly-gunicorn        # persistance au boot (idempotent)
systemctl enable --now foxugly-purge-contact.timer   # purge RGPD des messages de contact (idempotent)

echo "✓ foxugly privileged step done (nginx vhost + systemd units)."
