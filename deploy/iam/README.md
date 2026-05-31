# Policies IAM — foxugly

Deux rôles :

1. **`foxugly-ec2`** — rôle d'instance (profil EC2) : être piloté par SSM + lire les
   secrets dans Parameter Store (`/foxugly/prod/*`) et déchiffrer les SecureString.
2. **`foxugly-deploy`** — rôle assumé par GitHub Actions via OIDC : déclencher le
   déploiement (`ssm:SendCommand`) et lire le résultat.

Avant tout : remplacer `<ACCOUNT_ID>` et `<INSTANCE_ID>` dans les 3 fichiers JSON.
Région = `eu-west-1`, dépôt = `Foxugly/foxugly_website` (déjà câblés).

```bash
ACCOUNT_ID=123456789012          # le tien
INSTANCE_ID=i-0123456789abcdef0  # ton EC2
sed -i "s/<ACCOUNT_ID>/$ACCOUNT_ID/g; s/<INSTANCE_ID>/$INSTANCE_ID/g" deploy/iam/*.json
```

## 1. Rôle d'instance EC2 (`foxugly-ec2`)

```bash
# Rôle + trust EC2
aws iam create-role --role-name foxugly-ec2 \
  --assume-role-policy-document '{
    "Version":"2012-10-17",
    "Statement":[{"Effect":"Allow","Principal":{"Service":"ec2.amazonaws.com"},
                  "Action":"sts:AssumeRole"}]}'

# Gestion par SSM (policy AWS managée)
aws iam attach-role-policy --role-name foxugly-ec2 \
  --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore

# Lecture Parameter Store + KMS decrypt (policy de ce dossier)
aws iam put-role-policy --role-name foxugly-ec2 \
  --policy-name foxugly-ssm-read \
  --policy-document file://deploy/iam/instance-role-policy.json

# Profil d'instance + attache à l'EC2
aws iam create-instance-profile --instance-profile-name foxugly-ec2
aws iam add-role-to-instance-profile --instance-profile-name foxugly-ec2 --role-name foxugly-ec2
aws ec2 associate-iam-instance-profile --region eu-west-1 \
  --instance-id "$INSTANCE_ID" \
  --iam-instance-profile Name=foxugly-ec2
```

> **KMS** : la policy autorise `kms:Decrypt` via le service SSM (clé AWS managée
> `alias/aws/ssm`, suffisante pour des SecureString standard). Si tu utilises une
> **clé KMS gérée par toi**, ajoute aussi le rôle `foxugly-ec2` dans la *key policy*
> de cette clé.

## 2. Rôle de déploiement GitHub Actions (`foxugly-deploy`)

Pré-requis : le **provider OIDC GitHub** doit exister dans le compte (une seule fois) :

```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com
# (s'il existe déjà, ignorer l'erreur EntityAlreadyExists)
```

Puis le rôle :

```bash
aws iam create-role --role-name foxugly-deploy \
  --assume-role-policy-document file://deploy/iam/deploy-role-trust.json

aws iam put-role-policy --role-name foxugly-deploy \
  --policy-name foxugly-ssm-send \
  --policy-document file://deploy/iam/deploy-role-permissions.json

# L'ARN à mettre dans le secret GitHub AWS_DEPLOY_ROLE_ARN :
aws iam get-role --role-name foxugly-deploy --query Role.Arn --output text
```

Renseigner ensuite les **secrets GitHub** (Settings → Secrets → Actions) :
`AWS_DEPLOY_ROLE_ARN` (sortie ci-dessus) et `EC2_INSTANCE_ID`.
`AWS_REGION` est optionnel (défaut `eu-west-1` dans le workflow).

## Notes
- La trust policy restreint l'usage à **`refs/heads/main`**. Pour autoriser un
  `workflow_dispatch` depuis une autre branche, élargir le `:sub` (p.ex.
  `repo:Foxugly/foxugly_website:*`).
- `ssm:SendCommand` est restreint au document `AWS-RunShellScript` **et** à l'instance
  cible. Pour cibler par tag plutôt que par ID, remplacer l'ARN d'instance par `*` et
  ajouter une condition `ssm:resourceTag/...`.
