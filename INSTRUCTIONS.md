# Setup Instructions

## Create a New Project

```sh
npx create-react-router@latest --template purphoros/react-router-7-grunge-stack
cd ./react-router-7-grunge-stack
```

## Initialize Git Repository

```sh
git init
git add .
git commit -m "Initialize project"
git remote add origin git@github.com:<username>/<repo>.git
git branch -M main
git push -u origin main
```

## Environment Variables

Copy the example environment file:

```sh
cp .env.example .env
```

## GitHub Secrets

In your GitHub repository, go to **Settings > Secrets > Actions > Repository secrets** and add the following:

| Name | Secret |
|---|---|
| `AWS_ACCESS_KEY_ID` | your-access-key |
| `AWS_SECRET_ACCESS_KEY` | your-secret-key |

These values can be obtained from your AWS account in **IAM**.

## Deploy Environment Variables to AWS

Make sure you have the correct AWS account referenced in your `~/.aws/credentials` file before running these commands.

All environment variables need to be deployed to the AWS Parameter Store:

### Staging

```sh
npx arc env --add --env staging ARC_APP_SECRET $(openssl rand -hex 32)
npx arc env --add --env staging SESSION_SECRET $(openssl rand -hex 32)
```

### Production

```sh
npx arc env --add --env production ARC_APP_SECRET $(openssl rand -hex 32)
npx arc env --add --env production SESSION_SECRET $(openssl rand -hex 32)
```

These will be applied to the staging and production Lambda functions respectively.
