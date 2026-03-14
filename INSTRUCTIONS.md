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

## Deployment

Committing code changes should activate GitHub Actions to deploy to AWS.

You may need to activate them for your repository.

## Configure Allowed Action Origins

When deploying behind API Gateway or CloudFront, React Router's built-in origin check compares the `Origin` header against `Host`/`x-forwarded-host`. These won't match, causing form submissions (POST requests) to fail with **400 Bad Request**.

Update `react-router.config.ts` with your production domain(s):

```ts
export default {
  appDirectory: "app",
  serverBuildFile: "server-build.js",
  serverModuleFormat: "esm",
  allowedActionOrigins: ["example.com", "www.example.com"],
} satisfies Config;
```

# AWS Post-Deployment Setup

After running commiting code GitHub Actions uses Architect to create your core infrastructure via CloudFormation. This guide covers the additional AWS configuration needed for a production-ready deployment.

## What Architect Creates

Architect provisions the following resources:

- **API Gateway HTTP API** — routes all HTTP requests (`/*`) to Lambda
- **AWS Lambda** — runs your React Router server (Node.js 22.x)
- **DynamoDB Tables** — `user`, `password`, `note` (defined in `app.arc`)
- **S3 Bucket** — hosts static assets from `build/client`
- **IAM Roles & Policies** — Lambda execution permissions for DynamoDB and S3
- **CloudWatch Logs** — Lambda execution logs
- **CloudFormation Stack** — manages all resources (found in `sam.yaml`)

You can find your stack in the [CloudFormation console](https://console.aws.amazon.com/cloudformation/home). The stack name is a PascalCased version of your app name in `app.arc` (e.g. `ReactRouterGrungeStackProduction`).

## Route 53 DNS Setup

Skip this section if you're using an external DNS provider.

1. Go to [Route 53 → Hosted zones](https://console.aws.amazon.com/route53/v2/hostedzones) → **Create hosted zone**

2. Enter your domain name (e.g. `example.com`)

3. Note the 4 nameservers — update your domain registrar to use these

4. Add records as needed (see sections below for specific alias targets)

## SSL/TLS Certificate (ACM)

You need a certificate before setting up a custom domain or CloudFront.

1. Open the [ACM console](https://console.aws.amazon.com/acm/home)
   - **Important:** If you plan to use CloudFront, you must create the certificate in **us-east-1** (N. Virginia). Otherwise, use your app's region.

2. Click **Request a certificate** → **Request a public certificate**

3. Add your domain names:
   ```
   example.com
   www.example.com
   ```

4. Choose **DNS validation** (recommended — enables automatic renewal)

5. After requesting, ACM provides CNAME records. Add them to your DNS provider:
   ```
   Name:  _abc123def.example.com.
   Type:  CNAME
   Value: _abc123def.acm-validations.aws.
   ```
   If using Route 53, you can click "Create records in Route 53" to add them automatically.

6. Wait for status to change from **Pending validation** to **Issued** (usually 5–30 minutes)

## CloudFront CDN (Recommended)

CloudFront improves performance by caching static assets at edge locations worldwide and reduces load on your Lambda functions.

### Architecture

```
Client → CloudFront (edge) → API Gateway → Lambda → DynamoDB
                                                  → S3 (static assets)
```
****
### Create the Distribution

1. Go to [CloudFront → Distributions](https://console.aws.amazon.com/cloudfront/v3/home#/distributions) → **Create distribution**

2. **Specify origin:**
   - **Origin type:** API Gateway
   - **API Gateway origin:** Select Browse API's and find your app in the respective region (e.g. `abc123.execute-api.us-west-2.amazonaws.com`)
   - **Origin settings:** Use recommended origin settings 
   - **Cache settings:** Use recommended origin settings (Origin request policy should be `AllViewerExceptHostHeader` by default), see [Host Header Gotcha](#host-header-forwarding) below
     - **Viewer protocol policy:** Redirect HTTP to HTTPS
     - **Allowed HTTP methods:** GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE
     - **Cache policy:** `CachingDisabled` (HTML is dynamic/SSR)
     - **Compress objects:** Yes


3. **Settings:**
   - **Alternate domain name (CNAME):** `example.com`, `www.example.com`
   - **Custom SSL certificate:** Select your ACM certificate (must be in us-east-1)

4. Click **Create distribution**

### Add Cache Behavior for Static Assets

Your Vite build outputs hashed filenames (e.g. `app-abc123.js`), making them safe to cache aggressively.

1. Go to your distribution → **Behaviors** → **Create behavior**

2. Configure:
   - **Path pattern:** `/_static/*`
   - **Cache policy:** `CachingOptimized`
   - **Compress objects:** Yes

This caches static assets at edge locations while keeping HTML/API responses uncached.

### DNS Records for CloudFront

Create alias records pointing to your CloudFront distribution:

```
Name:  example.com
Type:  A (Alias)
Target: CloudFront distribution domain (e.g. d1234abcdef.cloudfront.net)

Name:  www.example.com
Type:  A (Alias)
Target: Same CloudFront distribution domain
```

### Update React Router Config

When using CloudFront, you **must** configure `allowedActionOrigins` in `react-router.config.ts`. React Router's built-in origin check compares the `Origin` header against `Host`/`x-forwarded-host`. CloudFront forwards requests with the API Gateway host, causing a mismatch that blocks form submissions.

```ts
export default {
  appDirectory: "app",
  serverBuildFile: "server-build.js",
  serverModuleFormat: "esm",
  allowedActionOrigins: ["example.com", "www.example.com"],
} satisfies Config;
```

## Gotchas

### Host Header Forwarding

CloudFront's default `AllViewer` origin request policy forwards the `Host` header from the client (which points to your CloudFront domain). API Gateway rejects requests with a mismatched `Host` header, returning **403 Forbidden**.

**Solution:** Use the `AllViewerExceptHostHeader` origin request policy. This strips the `Host` header from the viewer request and lets CloudFront add the correct one for API Gateway.

### Caching Dynamic vs Static Content

| Content | Path | Cache Policy | Why |
| --- | --- | --- | --- |
| HTML (SSR) | `/*` (default) | `CachingDisabled` | HTML changes per user/request |
| Static assets | `/_static/*` | `CachingOptimized` | Hashed filenames, safe to cache |
| API/actions | `/*` (default) | `CachingDisabled` | Dynamic responses, form submissions |

### Security Headers with CloudFront

If CloudFront caches a response, subsequent requests are served from edge without hitting Lambda. This means security headers set in Lambda may be missing from cached responses.

**Solution:** Add a [CloudFront Response Headers Policy](https://console.aws.amazon.com/cloudfront/v3/home#/policies/responseHeaders) with your security headers:

| Header | Value |
| --- | --- |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `SAMEORIGIN` |
| `X-XSS-Protection` | `1; mode=block` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |

### CloudFront Cache Invalidation

Invalidating cached objects costs money after the first 3,000 paths/month. Since your build outputs hashed filenames, you generally don't need to invalidate — new deploys produce new URLs automatically.

### Content Security Policy (CSP) and Nonces

CSP nonces are generated per-request in Lambda. Since dynamic HTML is not cached (using `CachingDisabled`), nonces work correctly. If you ever enable caching for HTML responses, nonces will break because cached responses serve stale nonces.


## Checklist

```
DNS (Route 53 or external):
[ ] Create hosted zone (Route 53 only)
[ ] Update domain registrar nameservers (Route 53 only)

Certificate:
[ ] Request ACM certificate (us-east-1 for CloudFront, or your app's region)
[ ] Add DNS validation CNAME records
[ ] Wait for certificate status: Issued

Option A — API Gateway custom domain (no CloudFront):
[ ] Create custom domain in API Gateway
[ ] Add API mapping to your stage
[ ] Create DNS A alias record → API Gateway

Option B — CloudFront (recommended):
[ ] Create CloudFront distribution with API Gateway origin
[ ] Set origin request policy: AllViewerExceptHostHeader
[ ] Set default behavior cache policy: CachingDisabled
[ ] Add /_static/* behavior with CachingOptimized
[ ] Add alternate domain names and SSL certificate
[ ] Create DNS A alias records → CloudFront
[ ] Add Response Headers Policy for security headers

React Router Config:
[ ] Uncomment and set allowedActionOrigins in react-router.config.ts
[ ] Update CSP domains in app/helpers/security.server.ts if needed

Verification:
[ ] Test page loads over HTTPS
[ ] Test form submissions (login, signup, notes)
[ ] Check security headers in browser DevTools
[ ] Verify static assets load from /_static/ path
[ ] Check CloudWatch logs for Lambda errors
```
