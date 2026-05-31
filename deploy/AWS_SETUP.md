# AWS — mise en place (à suivre dans l'ordre)

Compte `362629935151` · région `eu-west-1` · instance `i-0fe664678563bae5f` · bucket `foxugly-deploy`.

**Où lancer ?** Étapes 1→4 et 8 = **CloudShell** (console AWS, en admin).
Étape 5 = site **GitHub**. Étapes 6→7 = **sur l'instance** (SSH/Session Manager).

Dans CloudShell, une seule fois :
```bash
git clone https://github.com/Foxugly/foxugly_website.git
cd foxugly_website
```

---

## 1. Bucket S3  ✅ (déjà fait)
```bash
aws s3api create-bucket --bucket foxugly-deploy --region eu-west-1 \
  --create-bucket-configuration LocationConstraint=eu-west-1
aws s3api put-public-access-block --bucket foxugly-deploy \
  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

## 2. Secrets SSM
```bash
R="--region eu-west-1"
KEY=$(python3 -c "import secrets;print(secrets.token_urlsafe(50))")
aws ssm put-parameter $R --type SecureString --name /foxugly/prod/DJANGO_SECRET_KEY --value "$KEY"
aws ssm put-parameter $R --type String --name /foxugly/prod/DJANGO_DEBUG --value False
aws ssm put-parameter $R --type String --name /foxugly/prod/DJANGO_ALLOWED_HOSTS --value foxugly.com,www.foxugly.com
aws ssm put-parameter $R --type String --name /foxugly/prod/DJANGO_CSRF_TRUSTED_ORIGINS --value https://foxugly.com,https://www.foxugly.com
aws ssm put-parameter $R --type String --name /foxugly/prod/DJANGO_SECURE --value True
aws ssm put-parameter $R --type String --name /foxugly/prod/GUNICORN_BIND --value 127.0.0.1:8001
aws ssm put-parameter $R --type String --name /foxugly/prod/GUNICORN_WORKERS --value 2
aws ssm put-parameter $R --type String --name /foxugly/prod/SITE_URL --value https://www.foxugly.com
```
Vérif : `aws ssm get-parameters-by-path $R --path /foxugly/prod/ --query "Parameters[].Name" --output text`

## 3. Étendre le rôle de l'instance (quizonline-ec2)
```bash
aws iam put-role-policy --role-name quizonline-ec2 \
  --policy-name foxugly-ssm-s3-read \
  --policy-document file://deploy/iam/instance-role-policy.json
```
Vérif : `aws iam list-role-policies --role-name quizonline-ec2`

## 4. Rôle de déploiement GitHub (foxugly-deploy)
```bash
# a) provider OIDC GitHub (ignore l'erreur "EntityAlreadyExists" s'il existe déjà)
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com --client-id-list sts.amazonaws.com

# b) créer le rôle + sa policy (l'instance est déjà dans le JSON)
aws iam create-role --role-name foxugly-deploy \
  --assume-role-policy-document file://deploy/iam/deploy-role-trust.json
aws iam put-role-policy --role-name foxugly-deploy \
  --policy-name foxugly-deploy --policy-document file://deploy/iam/deploy-role-permissions.json

# c) afficher l'ARN du rôle (à copier pour l'étape 5)
aws iam get-role --role-name foxugly-deploy --query Role.Arn --output text
```
→ Copie l'ARN affiché (ex. `arn:aws:iam::362629935151:role/foxugly-deploy`).

## 5. Secrets GitHub (sur github.com)
Repo `Foxugly/foxugly_website` → **Settings → Secrets and variables → Actions → New repository secret** :
- `AWS_DEPLOY_ROLE_ARN` = l'ARN copié à l'étape 4c
- `EC2_INSTANCE_ID` = `i-0fe664678563bae5f`

## 6. Préparer l'instance (SSH / Session Manager, une fois)
```bash
sudo useradd -r -m -d /opt/foxugly -s /bin/bash foxugly
sudo mkdir -p /opt/foxugly/backend/media && sudo chown -R foxugly:foxugly /opt/foxugly
sudo apt-get install -y python3-venv libnginx-mod-brotli
```

## 7. Premier déploiement (bootstrap)
Voir **`DEPLOY.md §1`** (récupérer le dernier bundle S3, l'extraire, installer
`foxugly-env.service` + `foxugly.service` + le vhost nginx, puis `migrate` +
`seed_content` + `createsuperuser`). Les push suivants se déploient seuls.

> ⚠ Sur l'instance, l'`aws s3 cp` du déploiement doit passer par le **rôle d'instance**,
> pas par l'utilisateur `certbot-route53`. Si `cat /root/.aws/credentials` montre un
> `[default]` = certbot, on le bascule en profil nommé (à voir ensemble à cette étape).

## 8. Emails Graph (optionnel, plus tard)
App Azure AD + permission applicative **Mail.Send** (consentement admin), puis :
```bash
R="--region eu-west-1"
aws ssm put-parameter $R --type String       --name /foxugly/prod/GRAPH_TENANT_ID    --value <tenant>
aws ssm put-parameter $R --type String       --name /foxugly/prod/GRAPH_CLIENT_ID    --value <client-id>
aws ssm put-parameter $R --type SecureString --name /foxugly/prod/GRAPH_CLIENT_SECRET --value <secret>
aws ssm put-parameter $R --type String       --name /foxugly/prod/GRAPH_SENDER       --value contact@foxugly.com
aws ssm put-parameter $R --type String       --name /foxugly/prod/CONTACT_RECIPIENT  --value contact@foxugly.com
```
