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

OS : Amazon Linux 2023 ou Ubuntu 22.04+. Installer : `python3` + `venv`, `git`,
`nginx`, `nodejs` + `npm` (≥ 20), et l'**agent SSM** (préinstallé sur les AMI
Amazon Linux / Ubuntu récentes ; sinon installer `amazon-ssm-agent`).

L'instance doit avoir un **rôle IAM** avec la policy `AmazonSSMManagedInstanceCore`
(pour que SSM puisse y exécuter des commandes).

```bash
sudo useradd -r -m -d /opt/foxugly -s /bin/bash foxugly
sudo mkdir -p /opt/foxugly && sudo chown foxugly:foxugly /opt/foxugly
sudo -u foxugly git clone https://github.com/Foxugly/foxugly_website.git /opt/foxugly

# Backend : venv + dépendances + .env
cd /opt/foxugly/backend
sudo -u foxugly python3 -m venv .venv
sudo -u foxugly .venv/bin/pip install -r requirements.txt
sudo -u foxugly cp .env.example .env       # puis ÉDITER (voir §2)

# Première initialisation de la base + contenu + admin
sudo -u foxugly .venv/bin/python manage.py migrate
sudo -u foxugly .venv/bin/python manage.py seed_content   # ⚠ une seule fois (écrase le contenu)
sudo -u foxugly .venv/bin/python manage.py createsuperuser
sudo -u foxugly .venv/bin/python manage.py collectstatic --noinput

# Frontend : build initial
cd /opt/foxugly/frontend
sudo -u foxugly npm ci && sudo -u foxugly npm run build

# Services
sudo cp /opt/foxugly/deploy/foxugly.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now foxugly
sudo cp /opt/foxugly/deploy/nginx.conf /etc/nginx/sites-available/foxugly
sudo ln -s /etc/nginx/sites-available/foxugly /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# TLS (Let's Encrypt) — ajoute le 443 + redirection automatiquement
sudo certbot --nginx -d foxugly.com -d www.foxugly.com
```

> `seed_content` **écrase** tout le contenu : à ne lancer qu'à l'initialisation.

---

## 2. Configuration (`/opt/foxugly/backend/.env`)

Voir `backend/.env.example`. Au minimum :

```
DJANGO_SECRET_KEY=<clé générée>
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=foxugly.com,www.foxugly.com
DJANGO_CSRF_TRUSTED_ORIGINS=https://foxugly.com,https://www.foxugly.com
DJANGO_SECURE=True
```

Générer la clé : `python -c "from django.core.management.utils import get_random_secret_key as g; print(g())"`

**Option SSM Parameter Store** : stocker `DJANGO_SECRET_KEY` (type *SecureString*)
sous `/foxugly/prod/DJANGO_SECRET_KEY` et régénérer le `.env` au déploiement, p.ex.
au début de `deploy.sh` :
```bash
aws ssm get-parameter --name /foxugly/prod/DJANGO_SECRET_KEY --with-decryption \
  --query Parameter.Value --output text > /dev/null  # → injecter dans .env
```

---

## 3. CI/CD — secrets GitHub Actions

Dans **Settings → Secrets and variables → Actions** :

| Secret | Exemple | Rôle |
|---|---|---|
| `AWS_DEPLOY_ROLE_ARN` | `arn:aws:iam::123…:role/foxugly-deploy` | rôle assumé par OIDC |
| `AWS_REGION` | `eu-west-3` | région |
| `EC2_INSTANCE_ID` | `i-0123456789abcdef0` | instance cible |

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
aws ssm send-command --instance-ids i-0123… --document-name AWS-RunShellScript \
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
