# Déploiement — foxugly

foxugly tourne sur la **même EC2 que quizonline** (t3.small, eu-west-1) et suit le
**même pattern S3-bundle** : build en CI → bundle dans S3 → SSM dit à l'instance de
télécharger et déployer. **Aucune compilation sur le serveur.**

```
Internet ─► nginx (443/80, partagé)
              ├─ foxugly.com → frontend Angular (/var/www/django_websites/foxugly/frontend/dist/frontend/browser)
              │                + /api /api-auth /admin /static → Gunicorn 127.0.0.1:8004
              │                + /media → /var/www/django_websites/foxugly/backend/media
              └─ quizonline.…  (Gunicorn :8000)
            Gunicorn foxugly  [systemd: foxugly-gunicorn.service, :8004]
            secrets : /run/foxugly/.env  [systemd: foxugly-env.service ← SSM Parameter Store]

CI (push main) → build front+back → s3://foxugly-deploy/builds/foxugly/ → SSM → deploy/deploy.sh
```

---

## 1. Provisioning (une seule fois)

Sur l'instance (déjà gérée par SSM via le rôle `foxugly-fleet-ec2`). Pré-requis :
`python3`+`venv`, `nginx`, **AWS CLI** (pour `s3 cp`). Pas besoin de node/git.

```bash
# Répertoires (le code arrivera par le bundle). On réutilise l'utilisateur
# existant django (groupe www-data) — pas de useradd.
sudo mkdir -p /var/www/django_websites/foxugly/backend/media
sudo chown -R django:www-data /var/www/django_websites/foxugly
```

Comme tout le code arrive **par le bundle**, l'ordre de bootstrap est :

1. Créer les **paramètres SSM** `/foxugly/prod/*` (§2) et le **bucket + rôles IAM**
   (`deploy/iam/README.md`), renseigner les **secrets GitHub**.
2. **Pousser sur `main`** : la CI build et **dépose le bundle** dans S3. (Son étape
   SSM échouera tant que `foxugly-gunicorn.service` n'est pas installé — normal au 1er coup.)
3. **Premier déploiement manuel** sur l'instance (récupère le bundle + installe tout) :

```bash
# Récupère et extrait le dernier bundle
LATEST=$(aws s3 ls s3://foxugly-deploy/builds/foxugly/ --region eu-west-1 | sort | tail -1 | awk '{print $4}')
aws s3 cp "s3://foxugly-deploy/builds/foxugly/$LATEST" /tmp/b.tgz --region eu-west-1
sudo tar xzf /tmp/b.tgz -C /var/www/django_websites/foxugly
sudo chown -R django:www-data /var/www/django_websites/foxugly

# Services (depuis le bundle) + génération de l'env
sudo cp /var/www/django_websites/foxugly/deploy/foxugly-env.service /etc/systemd/system/
sudo cp /var/www/django_websites/foxugly/deploy/foxugly-gunicorn.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now foxugly-env          # écrit /run/foxugly/.env depuis SSM

# Init base + contenu + admin (une seule fois), env chargé depuis /run
sudo -u django bash
  set -a; . /run/foxugly/.env; set +a
  cd /var/www/django_websites/foxugly/backend
  python3 -m venv .venv && . .venv/bin/activate
  pip install -r requirements.txt
  python manage.py migrate
  python manage.py seed_content                  # ⚠ une seule fois (écrase le contenu)
  python manage.py createsuperuser
  python manage.py collectstatic --noinput
  exit

sudo systemctl enable --now foxugly-gunicorn     # Gunicorn :8004

# nginx (pattern sites-available + symlink, comme les autres sites ; cert wildcard déjà émis)
sudo cp /var/www/django_websites/foxugly/deploy/nginx.conf /etc/nginx/sites-available/foxugly.com
sudo ln -sf /etc/nginx/sites-available/foxugly.com /etc/nginx/sites-enabled/foxugly.com
sudo nginx -t && sudo systemctl reload nginx
```

> Ensuite, **chaque push sur `main` déploie tout seul** (build CI → S3 → SSM →
> `deploy.sh` : pip install → migrate → collectstatic → **sync nginx (sites-available
> + symlink) + reload** → restart). Les évolutions de `deploy/nginx.conf` se déploient
> donc seules. `seed_content` n'est **jamais** rejoué.

---

## 2. Secrets — SSM Parameter Store → `/run/foxugly/.env`

`/run/foxugly/.env` (tmpfs) est régénéré à chaque boot par `foxugly-env.service`,
qui lit `/foxugly/prod/*`. Créer les paramètres une fois :

```bash
KEY=$(python -c "from django.core.management.utils import get_random_secret_key as g; print(g())")
R="--region eu-west-1"
aws ssm put-parameter $R --type SecureString --name /foxugly/prod/SECRET_KEY --value "$KEY"
aws ssm put-parameter $R --type String --name /foxugly/prod/DEBUG --value False
aws ssm put-parameter $R --type String --name /foxugly/prod/ALLOWED_HOSTS --value foxugly.com,www.foxugly.com
aws ssm put-parameter $R --type String --name /foxugly/prod/CSRF_TRUSTED_ORIGINS --value https://foxugly.com,https://www.foxugly.com
aws ssm put-parameter $R --type String --name /foxugly/prod/SECURE --value True
# GUNICORN_BIND : override explicite. gunicorn.conf.py a désormais 8004 en défaut codé
# en dur → ce paramètre n'est plus indispensable (conservé pour rester explicite).
aws ssm put-parameter $R --type String --name /foxugly/prod/GUNICORN_BIND --value 127.0.0.1:8004
aws ssm put-parameter $R --type String --name /foxugly/prod/GUNICORN_WORKERS --value 2

# Formulaire de contact via Microsoft Graph (sinon les messages sont seulement stockés)
aws ssm put-parameter $R --type String       --name /foxugly/prod/GRAPH_TENANT_ID    --value <tenant>
aws ssm put-parameter $R --type String       --name /foxugly/prod/GRAPH_CLIENT_ID    --value <client-id>
aws ssm put-parameter $R --type SecureString --name /foxugly/prod/GRAPH_CLIENT_SECRET --value <secret>
aws ssm put-parameter $R --type String       --name /foxugly/prod/GRAPH_SENDER       --value contact@foxugly.com
aws ssm put-parameter $R --type String       --name /foxugly/prod/CONTACT_RECIPIENT  --value contact@foxugly.com

# Magic link (lien de connexion par email) — base d'URL des liens
aws ssm put-parameter $R --type String       --name /foxugly/prod/SITE_URL           --value https://www.foxugly.com

# Sentry (optionnel) :  /foxugly/prod/SENTRY_DSN
# PostgreSQL (optionnel) : /foxugly/prod/DB_ENGINE=postgresql + DB_*  (voir .env.example)
```

Voir `backend/.env.example` pour la liste. Après modif (rotation de secrets), en tant
que `django` via le drop-in sudoers (§5, sans le sudo global de `ubuntu`) :
`sudo /bin/systemctl restart foxugly-env foxugly-gunicorn`.

---

## 3. CI/CD — secrets GitHub Actions

| Secret | Exemple | Rôle |
|---|---|---|
| `AWS_DEPLOY_ROLE_ARN` | `arn:aws:iam::362629935151:role/foxugly-deploy` | rôle assumé par OIDC |
| `EC2_INSTANCE_ID` | `i-0123456789abcdef0` | instance cible (celle de quizonline) |
| `AWS_REGION` | `eu-west-1` | **optionnel** (défaut `eu-west-1`) |

Création des rôles + bucket : **`deploy/iam/README.md`** (étend `foxugly-fleet-ec2`,
crée `foxugly-deploy` OIDC, bucket `foxugly-deploy`).

---

## 4. Déploiement manuel (sans CI)

Le bundle existe déjà en S3 (produit par la CI). Depuis un poste autorisé :
```bash
aws ssm send-command --region eu-west-1 --instance-ids i-0123… \
  --document-name AWS-RunShellScript --parameters '{"commands":[
    "B=$(aws s3 ls s3://foxugly-deploy/builds/foxugly/ --region eu-west-1 | sort | tail -1 | awk \"{print \\$4}\")",
    "aws s3 cp s3://foxugly-deploy/builds/foxugly/$B /tmp/$B --region eu-west-1",
    "tar xzf /tmp/$B -C /var/www/django_websites/foxugly && chown -R django:www-data /var/www/django_websites/foxugly",
    "bash /var/www/django_websites/foxugly/deploy/deploy.sh"]}'
```

---

## 5. Exploitation

```bash
sudo systemctl status foxugly-gunicorn    # Gunicorn foxugly (:8004)
sudo journalctl -u foxugly-gunicorn -f    # logs applicatifs
sudo /bin/systemctl restart foxugly-gunicorn           # accordé à django (drop-in ci-dessous)
```

### Permissions sudo (least-privilege) — `foxugly-deploy`

`django` peut piloter ses propres services **sans le sudo global de `ubuntu`**, via le
drop-in `/etc/sudoers.d/foxugly-deploy` (modèle versionné : `deploy/sudoers.d/foxugly-deploy`).
Commandes accordées (chemins absolus, args exacts) :

| Commande | Usage |
|---|---|
| `sudo /bin/systemctl restart foxugly-gunicorn` | redéploiement / restart app |
| `sudo /bin/systemctl restart foxugly-env` | rotation des secrets (re-fetch SSM) |
| `sudo /bin/systemctl restart foxugly-env foxugly-gunicorn` | les deux d'un coup |
| `sudo /usr/sbin/nginx -t` + `sudo /bin/systemctl reload nginx` | recharge nginx à chaud |

**Durcissement** : le drop-in n'accorde **aucune** modification d'unit (`cp …service`,
`daemon-reload`) — les units restent gérées en root, hors de l'arbre éditable par django.

Installation (par **root**, jamais par `deploy.sh`) — valider la syntaxe AVANT, sinon
tout `sudo` casse :
```bash
command -v systemctl nginx   # /usr/bin/systemctl == /bin/systemctl (usrmerge) ; /usr/sbin/nginx
sudo visudo -c -f deploy/sudoers.d/foxugly-deploy
sudo install -m 0440 -o root -g root deploy/sudoers.d/foxugly-deploy /etc/sudoers.d/foxugly-deploy
sudo visudo -c
sudo -u django sudo -n /bin/systemctl reload nginx && echo OK       # test
```

### Permissions (schéma durable)

L'arbre `/var/www/django_websites/foxugly` est maintenu en **`django:www-data`**,
**dossiers 750 / fichiers 640** (bits d'exécution conservés pour `.venv`), **sans
écriture-groupe ni accès "autres"**. nginx (`www-data`) lit les statics et traverse
l'arbre via le groupe ; personne d'autre n'y accède. Ce schéma est appliqué et
maintenu automatiquement :

- `deploy.sh` / `bootstrap-instance.sh` posent `umask 027` puis, en fin de
  déploiement, normalisent : `chown -R django:www-data` + `chmod -R g-w,o-rwx`
  (idempotent, ne *retire* que des droits, préserve les `+x`).
- `foxugly-gunicorn.service` porte `UMask=0027` → les fichiers créés au runtime
  (WAL/journal SQLite, uploads media) naissent déjà en 640/750.

> **Report serveur de la modif `UMask=`** : l'unit est resynchronisée
> automatiquement par `deploy.sh` (`cmp` → `cp` → `daemon-reload` → `restart`),
> donc elle prend effet **au prochain déploiement**. Pour l'appliquer
> immédiatement sans déploiement complet :
> ```bash
> sudo cp deploy/foxugly-gunicorn.service /etc/systemd/system/
> sudo systemctl daemon-reload && sudo systemctl restart foxugly-gunicorn
> ```
> Re-normaliser un arbre existant (one-shot) : `sudo chown -R django:www-data
> /var/www/django_websites/foxugly && sudo chmod -R g-w,o-rwx /var/www/django_websites/foxugly`.

---

## 6. Monitoring / santé

Sonde dédiée : **`GET https://www.foxugly.com/health`** → `200 {"status":"ok"}`.
Elle traverse toute la chaîne (nginx → Gunicorn → Django → DB : un `SELECT 1`) et
renvoie **503** si la base est injoignable. `access_log` coupé côté nginx (pings
fréquents). Accepte `/health` et `/health/`.

- **UptimeRobot** (ou autre) : surveiller l'URL `/health`, type *keyword* `ok` ou
  simplement *HTTP 200*. La CI fait déjà ce check après chaque déploiement.
- Vérif manuelle : `curl -fsS https://www.foxugly.com/health`.
- Sonde plus stricte possible (vérifier `status==ok` dans le JSON) côté monitoring.

L'endpoint nginx (`location ~ ^/health/?$`) est livré dans `deploy/nginx.conf` et
appliqué automatiquement par `deploy.sh` (sync + `nginx -t` + reload).

---

## 7. Migration SQLite → PostgreSQL

foxugly réutilise le **PostgreSQL local déjà présent** sur l'EC2 (celui de quizonline) :
on y crée une base + un user `foxugly` dédiés. **Aucun changement de code** (`settings.py`
est piloté par env, `psycopg` est dans `requirements.txt`). Données transférées via
`dumpdata`/`loaddata` (agnostique du moteur).

> ⚠️ Fenêtre de bascule : entre le dump (2) et le `loaddata` (4), toute écriture
> (formulaire de contact, édition admin) irait dans SQLite et serait perdue. Stopper
> Gunicorn le temps de la bascule (~1 min de 502) garantit l'absence de perte.

```bash
# 0. (recommandé) geler les écritures
sudo systemctl stop foxugly-gunicorn

# 1. base + user dans le postgres existant (PWD fort)
PWD_FOX='...'
sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
CREATE USER foxugly WITH PASSWORD '${PWD_FOX}';
CREATE DATABASE foxugly OWNER foxugly ENCODING 'UTF8' TEMPLATE template0;
SQL

# 2. dump des données SQLite (AVANT toute bascule d'env)
sudo -u django bash -c '
  set -a; . /run/foxugly/.env; set +a
  cd /var/www/django_websites/foxugly/backend && . .venv/bin/activate
  python manage.py dumpdata --natural-foreign --natural-primary \
    -e contenttypes -e auth.permission -e admin.logentry -e sessions.session \
    --indent 2 -o /tmp/foxugly_data.json'

# 3. params SSM (depuis CloudShell/poste admin — l'instance n'a pas ssm:PutParameter)
R="--region eu-west-1"
aws ssm put-parameter $R --type String       --name /foxugly/prod/DB_ENGINE   --value postgresql
aws ssm put-parameter $R --type String       --name /foxugly/prod/DB_NAME     --value foxugly
aws ssm put-parameter $R --type String       --name /foxugly/prod/DB_USER     --value foxugly
aws ssm put-parameter $R --type SecureString --name /foxugly/prod/DB_PASSWORD --value "$PWD_FOX"
aws ssm put-parameter $R --type String       --name /foxugly/prod/DB_HOST     --value 127.0.0.1
aws ssm put-parameter $R --type String       --name /foxugly/prod/DB_PORT     --value 5432

# 4. régénérer l'env + créer le schéma + charger les données dans postgres
sudo systemctl restart foxugly-env
grep '^DB' /run/foxugly/.env            # vérifier les 6 vars
sudo -u django bash -c '
  set -a; . /run/foxugly/.env; set +a
  cd /var/www/django_websites/foxugly/backend && . .venv/bin/activate
  python manage.py migrate --noinput
  python manage.py loaddata /tmp/foxugly_data.json'

# 5. redémarrer + vérifier
sudo systemctl start foxugly-gunicorn
curl -fsS https://www.foxugly.com/health
sudo -u postgres psql -d foxugly -c "SELECT count(*) FROM content_page;"
rm -f /tmp/foxugly_data.json                   # contient des données → ne pas laisser traîner
```

`db.sqlite3` est conservé comme **backup** (à supprimer seulement après quelques jours
de prod Postgres sereins). Backups Postgres : prévoir un `pg_dump` régulier de la base
`foxugly` (cron + bucket S3), l'instance pouvant être éphémère.

---

## Notes
- **Base SQLite** dans `/var/www/django_websites/foxugly/backend/db.sqlite3` (hors bundle, persistée
  entre déploiements). **Médias** dans `/var/www/django_websites/foxugly/backend/media/` (idem). Prévoir
  une sauvegarde si l'instance est éphémère (ou bucket S3).
- **Frontend** : buildé en CI et livré dans le bundle ; nginx le sert directement.
- Passage à **PostgreSQL** : aucun changement de code (`settings.py` est déjà piloté
  par env). Définir `DB_ENGINE=postgresql` + `DB_*` dans SSM `/foxugly/prod/`
  (`psycopg` est déjà dans `requirements.txt`).
