# Policies IAM — foxugly

Compte `362629935151`, région `eu-west-1`. foxugly tourne sur la **même instance que
quizonline** et suit le même pattern (secrets SSM `/foxugly/prod/`, bundles S3
`foxugly-deploy/builds/foxugly/`).

Deux choses à faire :
1. **Étendre le rôle d'instance existant `foxugly-fleet-ec2`** avec les permissions
   foxugly (lecture SSM `/foxugly/prod` + S3 `foxugly-deploy`).
2. **Créer le rôle CI `foxugly-deploy`** (OIDC GitHub) pour uploader le bundle et
   déclencher SSM.

L'instance cible (`i-0fe664678563bae5f`) et le compte sont déjà renseignés dans les
fichiers JSON — rien à substituer.

## 0. Bucket S3 des bundles (une fois)

```bash
aws s3api create-bucket --bucket foxugly-deploy --region eu-west-1 \
  --create-bucket-configuration LocationConstraint=eu-west-1
aws s3api put-public-access-block --bucket foxugly-deploy \
  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

## 1. Étendre le rôle d'instance `foxugly-fleet-ec2`

Pas de nouveau rôle ni de nouveau profil : on ajoute une policy inline à celui qui
est déjà attaché à l'EC2.

```bash
aws iam put-role-policy --role-name foxugly-fleet-ec2 \
  --policy-name foxugly-ssm-s3-read \
  --policy-document file://deploy/iam/instance-role-policy.json
```

> Pas de `kms:Decrypt` : comme pour quizonline, les SecureString `/foxugly/prod/*`
> utilisent la clé SSM par défaut (`alias/aws/ssm`), dont la *key policy* autorise
> déjà le compte via le service SSM.

## 2. Rôle de déploiement GitHub Actions (`foxugly-deploy`)

Provider OIDC GitHub (déjà présent si quizonline déploie via OIDC ; sinon) :
```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com
# ignorer EntityAlreadyExists
```

Rôle + permissions (S3 PutObject + SSM SendCommand) :
```bash
aws iam create-role --role-name foxugly-deploy \
  --assume-role-policy-document file://deploy/iam/deploy-role-trust.json

aws iam put-role-policy --role-name foxugly-deploy \
  --policy-name foxugly-deploy \
  --policy-document file://deploy/iam/deploy-role-permissions.json

# ARN à mettre dans le secret GitHub AWS_DEPLOY_ROLE_ARN :
aws iam get-role --role-name foxugly-deploy --query Role.Arn --output text
```

Secrets GitHub (Settings → Secrets → Actions) : `AWS_DEPLOY_ROLE_ARN` + `EC2_INSTANCE_ID`.
`AWS_REGION` optionnel (défaut `eu-west-1`).

## Fichiers
- `instance-role-policy.json` — à attacher à `foxugly-fleet-ec2` (SSM `/foxugly/prod` + S3 GetObject).
- `deploy-role-permissions.json` — rôle CI : S3 PutObject `foxugly-deploy/builds/*`,
  SSM SendCommand (RunShellScript + instance) + lecture du résultat.
- `deploy-role-trust.json` — trust OIDC restreint à `Foxugly/foxugly_website` branche `main`.

## Notes
- Trust limité à `refs/heads/main` : élargir le `:sub` pour un dispatch d'une autre branche.
- `ssm:SendCommand` restreint au document `AWS-RunShellScript` + l'instance cible.
