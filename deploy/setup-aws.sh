#!/usr/bin/env bash
#
# Met en place TOUT l'AWS pour foxugly, en une fois, depuis CloudShell (admin).
#   cd foxugly_website && git pull && bash deploy/setup-aws.sh
#
# Idempotent : relançable sans casser ce qui existe déjà.
set -uo pipefail

R="--region eu-west-1"
INSTANCE="i-0fe664678563bae5f"
BUCKET="foxugly-deploy"

echo "== 1/4  Bucket S3 ($BUCKET) =="
aws s3api create-bucket --bucket "$BUCKET" --region eu-west-1 \
  --create-bucket-configuration LocationConstraint=eu-west-1 2>/dev/null && echo "  créé" || echo "  (déjà là)"
aws s3api put-public-access-block --bucket "$BUCKET" \
  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
echo

echo "== 2/4  Paramètres SSM (/foxugly/prod/) =="
KEY=$(aws ssm get-parameter $R --name /foxugly/prod/DJANGO_SECRET_KEY --with-decryption \
        --query Parameter.Value --output text 2>/dev/null \
      || python3 -c "import secrets;print(secrets.token_urlsafe(50))")
put() { aws ssm put-parameter $R --overwrite --type "$1" --name "$2" --value "$3" >/dev/null && echo "  $2"; }
put SecureString /foxugly/prod/DJANGO_SECRET_KEY "$KEY"
put String /foxugly/prod/DJANGO_DEBUG False
put String /foxugly/prod/DJANGO_ALLOWED_HOSTS foxugly.com,www.foxugly.com
put String /foxugly/prod/DJANGO_CSRF_TRUSTED_ORIGINS https://foxugly.com,https://www.foxugly.com
put String /foxugly/prod/DJANGO_SECURE True
put String /foxugly/prod/GUNICORN_BIND 127.0.0.1:8004
put String /foxugly/prod/GUNICORN_WORKERS 2
put String /foxugly/prod/SITE_URL https://www.foxugly.com
echo

echo "== 3/4  Étendre le rôle d'instance (quizonline-ec2) =="
aws iam put-role-policy --role-name quizonline-ec2 \
  --policy-name foxugly-ssm-s3-read \
  --policy-document file://deploy/iam/instance-role-policy.json && echo "  OK"
echo

echo "== 4/4  Rôle de déploiement (foxugly-deploy, OIDC) =="
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com --client-id-list sts.amazonaws.com 2>/dev/null \
  && echo "  provider OIDC créé" || echo "  (provider OIDC déjà là)"
aws iam create-role --role-name foxugly-deploy \
  --assume-role-policy-document file://deploy/iam/deploy-role-trust.json 2>/dev/null \
  && echo "  rôle créé" || echo "  (rôle déjà là)"
aws iam put-role-policy --role-name foxugly-deploy \
  --policy-name foxugly-deploy --policy-document file://deploy/iam/deploy-role-permissions.json && echo "  policy OK"
ARN=$(aws iam get-role --role-name foxugly-deploy --query Role.Arn --output text)
echo

echo "=========================================================="
echo " AWS prêt. Dernière action MANUELLE (sur github.com) :"
echo " Repo Foxugly/foxugly_website → Settings → Secrets and"
echo " variables → Actions → New repository secret, deux fois :"
echo
echo "   AWS_DEPLOY_ROLE_ARN = $ARN"
echo "   EC2_INSTANCE_ID     = $INSTANCE"
echo "=========================================================="
