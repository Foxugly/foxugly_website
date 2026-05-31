# Déploiement — foxugly

Architecture cible (1 serveur, tout en **same-origin** pour préserver les cookies
de session + CSRF) :

```
Internet ─► nginx (443/80)
              ├─ /                 → frontend Angular (dist/frontend/browser)
              ├─ /api /api-auth /admin /static → Gunicorn (127.0.0.1:8000)
              └─ /media            → /opt/foxugly/backend/media
            Gunicorn ─► Django (foxugly.wsgi)  [systemd: foxugly.service]
```

Le **déploiement est automatique** : un push sur `main` déclenche le workflow
GitHub Actions (`.github/workflows/deploy.yml`) qui, via **AWS SSM Run Command**,
exécute `deploy/deploy.sh` sur l'EC2 (git pull → backend → build frontend → restart).

---

## 1. Pré-requis serveur (EC2, une seule fois)

Cible : **t3.small** (2 vCPU / 2 GiB) en région **eu-west-1**, OS Amazon Linux 2023
ou Ubuntu 22.04+. Installer : `python3` + `venv`, `git`, `nginx`, `nodejs` + `npm`
(≥ 20), et l'**agent SSM** (préinstallé sur les AMI Amazon Linux / Ubuntu récentes ;
sinon installer `amazon-ssm-agent`).

L'instance doit avoir un **rôle IAM** avec la policy `AmazonSSMManagedInstanceCore`
(pour que SSM puisse y exécuter des commandes).

> **Swap (important sur t3.small)** : 2 GiB de RAM suffisent à faire planter le build
> Angular (esbuild). Créer 2 GiB de swap une fois pour toutes :
> ```bash
> sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
> sudo mkswap /swapfile && sudo swapon /swapfile
> echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
> ```

```bash
sudo useradd -r -m -d /opt/foxugly -s /bin/bash foxugly
sudo mkdir -p /opt/foxugly && sudo chown foxugly:foxugly /opt/foxugly
sudo -u foxugly git clone https://github.com/Foxugly/foxugly_website.git /opt/foxugly

# Backend : venv + dépendances
cd /opt/foxugly/backend
sudo -u foxugly python3 -m venv .venv
sudo -u foxugly .venv/bin/pip install -r requirements.txt

# Secrets : créer d'abord les paramètres SSM (voir §2), puis générer /run/foxugly/.env
sudo cp /opt/foxugly/deploy/foxugly-env.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now foxugly-env        # écrit /run/foxugly/.env depuis SSM

# Première initialisation (base + contenu + admin), env chargé depuis /run
sudo -u foxugly bash
  set -a; . /run/foxugly/.env; set +a
  cd /opt/foxugly/backend
  .venv/bin/python manage.py migrate
  .venv/bin/python manage.py seed_content      # ⚠ une seule fois (écrase le contenu)
  .venv/bin/python manage.py createsuperuser
  .venv/bin/python manage.py collectstatic --noinput
  # Frontend : build initial
  cd /opt/foxugly/frontend && npm ci && npm run build
  exit

# Services applicatifs
sudo cp /opt/foxugly/deploy/foxugly.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now foxugly

# nginx — le certificat wildcard *.foxugly.com (DNS-01) est déjà en place ;
# nginx.conf contient directement le bloc 443. Vérifier que ces 2 fichiers existent
# (créés par certbot ; sinon les générer) :
#   /etc/letsencrypt/options-ssl-nginx.conf  et  /etc/letsencrypt/ssl-dhparams.pem
sudo cp /opt/foxugly/deploy/nginx.conf /etc/nginx/sites-available/foxugly
sudo ln -s /etc/nginx/sites-available/foxugly /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

> `seed_content` **écrase** tout le contenu : à ne lancer qu'à l'initialisation.

---

## 2. Secrets — SSM Parameter Store → `/run/foxugly/.env`

Le `.env` vit dans **`/run/foxugly/`** (tmpfs, effacé au reboot). `foxugly-env.service`
le **régénère à chaque boot** en lisant les paramètres sous le préfixe `/foxugly/prod/`
de **SSM Parameter Store**. Voir `backend/.env.example` pour la liste des clés.

Créer les paramètres une fois (depuis un poste autorisé) :
```bash
KEY=$(python -c "from django.core.management.utils import get_random_secret_key as g; print(g())")
R="--region eu-west-1"
aws ssm put-parameter $R --type SecureString --name /foxugly/prod/DJANGO_SECRET_KEY --value "$KEY"
aws ssm put-parameter $R --type String --name /foxugly/prod/DJANGO_DEBUG --value False
aws ssm put-parameter $R --type String --name /foxugly/prod/DJANGO_ALLOWED_HOSTS --value foxugly.com,www.foxugly.com
aws ssm put-parameter $R --type String --name /foxugly/prod/DJANGO_CSRF_TRUSTED_ORIGINS --value https://foxugly.com,https://www.foxugly.com
aws ssm put-parameter $R --type String --name /foxugly/prod/DJANGO_SECURE --value True
aws ssm put-parameter $R --type String --name /foxugly/prod/GUNICORN_WORKERS --value 3
```

Le **rôle IAM de l'instance** doit autoriser `ssm:GetParametersByPath` sur
`arn:aws:ssm:eu-west-1:*:parameter/foxugly/prod/*` (+ `kms:Decrypt` pour le SecureString).
Après modification d'un paramètre : `sudo systemctl restart foxugly-env foxugly`.

---

## 3. CI/CD — secrets GitHub Actions

Dans **Settings → Secrets and variables → Actions** :

| Secret | Exemple | Rôle |
|---|---|---|
| `AWS_DEPLOY_ROLE_ARN` | `arn:aws:iam::123…:role/foxugly-deploy` | rôle assumé par OIDC |
| `EC2_INSTANCE_ID` | `i-0123456789abcdef0` | instance cible |
| `AWS_REGION` | `eu-west-1` | **optionnel** (défaut `eu-west-1`) |

Le rôle `AWS_DEPLOY_ROLE_ARN` doit :
- faire confiance au provider OIDC GitHub (`token.actions.githubusercontent.com`),
  restreint au dépôt `Foxugly/foxugly_website` ;
- autoriser `ssm:SendCommand`, `ssm:GetCommandInvocation`, `ssm:ListCommandInvocations`.

Ensuite, **chaque push sur `main` déploie automatiquement**. Déclenchement manuel
possible via l'onglet *Actions* (workflow_dispatch).

---

## 4. Déploiement manuel (sans CI)

Via SSM depuis un poste autorisé :
```bash
aws ssm send-command --region eu-west-1 --instance-ids i-0123… \
  --document-name AWS-RunShellScript \
  --parameters 'commands=["bash /opt/foxugly/deploy/deploy.sh main"]'
```
Ou en SSH/Session Manager sur le serveur : `sudo bash /opt/foxugly/deploy/deploy.sh main`.

`deploy.sh` ne lance **que `migrate`** (jamais `seed_content`) : le contenu en base
est préservé.

---

## 5. Exploitation

```bash
sudo systemctl status foxugly        # état de Gunicorn
sudo journalctl -u foxugly -f        # logs applicatifs
sudo systemctl restart foxugly       # redémarrage
```

## Notes
- **Base de données** : SQLite par défaut (suffisant pour ce site). Pour passer à
  PostgreSQL, adapter `DATABASES` dans `settings.py` (via une var d'env) et installer
  `psycopg`. Penser à exclure `db.sqlite3` des sauvegardes git (déjà `.gitignore`).
- **Frontend** : alternative S3 + CloudFront possible, mais il faudrait alors une
  API sur un autre domaine → cookies cross-site (`SameSite=None; Secure`) + CORS.
  L'approche nginx same-origin évite ça.
- **Médias** : `media/` (logos partenaires) vit sur le disque de l'instance ;
  prévoir une sauvegarde (ou un bucket S3) si l'instance est éphémère.
