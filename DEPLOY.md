# Déploiement — foxugly

foxugly tourne sur la **même EC2 que quizonline** (t3.small, eu-west-1) et suit le
**même pattern S3-bundle** : build en CI → bundle dans S3 → SSM dit à l'instance de
télécharger et déployer. **Aucune compilation sur le serveur.**

```
Internet ─► nginx (443/80, partagé)
              ├─ foxugly.com → frontend Angular (/opt/foxugly/frontend/dist/frontend/browser)
              │                + /api /api-auth /admin /static → Gunicorn 127.0.0.1:8004
              │                + /media → /opt/foxugly/backend/media
              └─ quizonline.…  (Gunicorn :8000)
            Gunicorn foxugly  [systemd: foxugly.service, :8004]
            secrets : /run/foxugly/.env  [systemd: foxugly-env.service ← SSM Parameter Store]

CI (push main) → build front+back → s3://foxugly-deploy/builds/ → SSM → deploy/deploy.sh
```

---

## 1. Provisioning (une seule fois)

Sur l'instance (déjà gérée par SSM via le rôle `quizonline-ec2`). Pré-requis :
`python3`+`venv`, `nginx`, **AWS CLI** (pour `s3 cp`). Pas besoin de node/git.

```bash
# Répertoires (le code arrivera par le bundle). On réutilise l'utilisateur
# existant django (groupe www-data) — pas de useradd.
sudo mkdir -p /opt/foxugly/backend/media
sudo chown -R django:www-data /opt/foxugly
```

Comme tout le code arrive **par le bundle**, l'ordre de bootstrap est :

1. Créer les **paramètres SSM** `/foxugly/prod/*` (§2) et le **bucket + rôles IAM**
   (`deploy/iam/README.md`), renseigner les **secrets GitHub**.
2. **Pousser sur `main`** : la CI build et **dépose le bundle** dans S3. (Son étape
   SSM échouera tant que `foxugly.service` n'est pas installé — normal au 1er coup.)
3. **Premier déploiement manuel** sur l'instance (récupère le bundle + installe tout) :

```bash
# Récupère et extrait le dernier bundle
LATEST=$(aws s3 ls s3://foxugly-deploy/builds/ --region eu-west-1 | sort | tail -1 | awk '{print $4}')
aws s3 cp "s3://foxugly-deploy/builds/$LATEST" /tmp/b.tgz --region eu-west-1
sudo tar xzf /tmp/b.tgz -C /opt/foxugly
sudo chown -R django:www-data /opt/foxugly

# Services (depuis le bundle) + génération de l'env
sudo cp /opt/foxugly/deploy/foxugly-env.service /etc/systemd/system/
sudo cp /opt/foxugly/deploy/foxugly.service     /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now foxugly-env          # écrit /run/foxugly/.env depuis SSM

# Init base + contenu + admin (une seule fois), env chargé depuis /run
sudo -u django bash
  set -a; . /run/foxugly/.env; set +a
  cd /opt/foxugly/backend
  python3 -m venv .venv && . .venv/bin/activate
  pip install -r requirements.txt
  python manage.py migrate
  python manage.py seed_content                  # ⚠ une seule fois (écrase le contenu)
  python manage.py createsuperuser
  python manage.py collectstatic --noinput
  exit

sudo systemctl enable --now foxugly              # Gunicorn :8004

# nginx (vhost foxugly, coexiste avec quizonline ; cert wildcard *.foxugly.com déjà émis)
sudo cp /opt/foxugly/deploy/nginx.conf /etc/nginx/sites-available/foxugly
sudo ln -s /etc/nginx/sites-available/foxugly /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

> Ensuite, **chaque push sur `main` déploie tout seul** (build CI → S3 → SSM →
> `deploy.sh` : pip install → migrate → collectstatic → restart). `seed_content`
> n'est **jamais** rejoué.

---

## 2. Secrets — SSM Parameter Store → `/run/foxugly/.env`

`/run/foxugly/.env` (tmpfs) est régénéré à chaque boot par `foxugly-env.service`,
qui lit `/foxugly/prod/*`. Créer les paramètres une fois :

```bash
KEY=$(python -c "from django.core.management.utils import get_random_secret_key as g; print(g())")
R="--region eu-west-1"
aws ssm put-parameter $R --type SecureString --name /foxugly/prod/DJANGO_SECRET_KEY --value "$KEY"
aws ssm put-parameter $R --type String --name /foxugly/prod/DJANGO_DEBUG --value False
aws ssm put-parameter $R --type String --name /foxugly/prod/DJANGO_ALLOWED_HOSTS --value foxugly.com,www.foxugly.com
aws ssm put-parameter $R --type String --name /foxugly/prod/DJANGO_CSRF_TRUSTED_ORIGINS --value https://foxugly.com,https://www.foxugly.com
aws ssm put-parameter $R --type String --name /foxugly/prod/DJANGO_SECURE --value True
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
# PostgreSQL (optionnel) : /foxugly/prod/DJANGO_DB_ENGINE=postgresql + DJANGO_DB_*  (voir .env.example)
```

Voir `backend/.env.example` pour la liste. Après modif : `sudo systemctl restart foxugly-env foxugly`.

---

## 3. CI/CD — secrets GitHub Actions

| Secret | Exemple | Rôle |
|---|---|---|
| `AWS_DEPLOY_ROLE_ARN` | `arn:aws:iam::362629935151:role/foxugly-deploy` | rôle assumé par OIDC |
| `EC2_INSTANCE_ID` | `i-0123456789abcdef0` | instance cible (celle de quizonline) |
| `AWS_REGION` | `eu-west-1` | **optionnel** (défaut `eu-west-1`) |

Création des rôles + bucket : **`deploy/iam/README.md`** (étend `quizonline-ec2`,
crée `foxugly-deploy` OIDC, bucket `foxugly-deploy`).

---

## 4. Déploiement manuel (sans CI)

Le bundle existe déjà en S3 (produit par la CI). Depuis un poste autorisé :
```bash
aws ssm send-command --region eu-west-1 --instance-ids i-0123… \
  --document-name AWS-RunShellScript --parameters '{"commands":[
    "B=$(aws s3 ls s3://foxugly-deploy/builds/ --region eu-west-1 | sort | tail -1 | awk \"{print \\$4}\")",
    "aws s3 cp s3://foxugly-deploy/builds/$B /tmp/$B --region eu-west-1",
    "tar xzf /tmp/$B -C /opt/foxugly && chown -R django:www-data /opt/foxugly",
    "bash /opt/foxugly/deploy/deploy.sh"]}'
```

---

## 5. Exploitation

```bash
sudo systemctl status foxugly        # Gunicorn foxugly (:8004)
sudo journalctl -u foxugly -f        # logs applicatifs
sudo systemctl restart foxugly
```

## Notes
- **Base SQLite** dans `/opt/foxugly/backend/db.sqlite3` (hors bundle, persistée
  entre déploiements). **Médias** dans `/opt/foxugly/backend/media/` (idem). Prévoir
  une sauvegarde si l'instance est éphémère (ou bucket S3).
- **Frontend** : buildé en CI et livré dans le bundle ; nginx le sert directement.
- Passage à **PostgreSQL** possible : adapter `DATABASES` (var d'env) + `psycopg`.
