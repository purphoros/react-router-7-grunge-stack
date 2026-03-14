# React Router 7 Grunge Stack

![The React Router Grunge Stack](https://repository-images.githubusercontent.com/463325363/edae4f5b-1a13-47ea-b90c-c05badc2a700)

Learn more about [React Router](https://reactrouter.com).

```
npx create-react-router@latest --template purphoros/react-router-7-grunge-stack
```

## What's in the stack

- [AWS deployment](https://aws.com) with [Architect](https://arc.codes/)
- Production-ready [DynamoDB Database](https://aws.amazon.com/dynamodb/)
- [GitHub Actions](https://github.com/features/actions) for deploy on merge to production and staging environments
- Email/Password Authentication with [cookie-based sessions](https://reactrouter.com/utils/sessions#createcookiesessionstorage)
- DynamoDB access via [`arc.tables`](https://arc.codes/docs/en/reference/runtime-helpers/node.js#arc.tables)
- Styling with [Tailwind](https://tailwindcss.com/)
- End-to-end testing with [Cypress](https://cypress.io)
- Local third party request mocking with [MSW](https://mswjs.io)
- Unit testing with [Vitest](https://vitest.dev) and [Testing Library](https://testing-library.com)
- Code formatting with [Prettier](https://prettier.io)
- Linting with [ESLint](https://eslint.org)
- Static Types with [TypeScript](https://typescriptlang.org)
- Security headers, nonce-based CSP, and CSRF protection

Not a fan of bits of the stack? Fork it, change it, and use `npx create-react-router@latest --template your/repo`! Make it your own.

## Development

- Initialize a new git repository and commit your project:

  ```sh
  git init
  git add .
  git commit -m "Initialize project"
  git remote add origin <your-repo-url>
  git push -u origin main
  ```

- Validate the app has been set up properly (optional):

  ```sh
  npm run validate
  ```

- Start dev server:

  ```sh
  npm run dev
  ```

This starts your app in development mode, rebuilding assets on file changes.

### Relevant code:

This is a pretty simple note-taking app, but it's a good example of how you can build a full stack app with Architect and React Router. The main functionality is creating users, logging in and out, and creating and deleting notes.

- creating users, and logging in and out [./app/models/user.server.ts](./app/models/user.server.ts)
- user sessions, and verifying them [./app/session.server.ts](./app/session.server.ts)
- creating, and deleting notes [./app/models/note.server.ts](./app/models/note.server.ts)

The database that comes with `arc sandbox` is an in memory database, so if you restart the server, you'll lose your data. The Staging and Production environments won't behave this way, instead they'll persist the data in DynamoDB between deployments and Lambda executions.

## Security

This stack includes built-in security headers, Content Security Policy (CSP), and CSRF protection. All configuration lives in [`app/helpers/security.server.ts`](./app/helpers/security.server.ts).

### Content Security Policy

The CSP is built from individual directives in the `buildCSP()` function. To allow additional sources, add the domains to the relevant directive:

```ts
function buildCSP(scriptInline: string): string {
  const directives = [
    `default-src 'self'`,
    `script-src 'self' ${scriptInline}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: user-images.githubusercontent.com reactrouter.com`,
    `font-src 'self' data:`,
    `connect-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'self'`,
  ];
  return directives.join("; ");
}
```

Common examples:

- **Loading images from a CDN**: Add the domain to `img-src`
  ```
  `img-src 'self' data: blob: cdn.example.com`
  ```
- **Loading fonts from Google Fonts**: Add domains to `font-src` and `style-src`
  ```
  `font-src 'self' data: fonts.gstatic.com`
  `style-src 'self' 'unsafe-inline' fonts.googleapis.com`
  ```
- **Loading scripts from a third-party** (e.g. analytics): Add the domain to `script-src` and `connect-src`
  ```
  `script-src 'self' ${scriptInline} analytics.example.com`
  `connect-src 'self' analytics.example.com`
  ```
- **Embedding iframes** (e.g. YouTube): Add a `frame-src` directive
  ```
  `frame-src 'self' www.youtube.com`
  ```

In development, `script-src` uses `'unsafe-inline'` instead of nonces for compatibility with Vite's HMR. In production, a unique nonce is generated per request and passed to `<ServerRouter>` and `renderToPipeableStream`.

### HTTP Security Headers

The following headers are set on every response:

| Header | Value |
| --- | --- |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `SAMEORIGIN` |
| `X-XSS-Protection` | `1; mode=block` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |

### CSRF Protection

All mutating form actions are protected with a Synchronizer Token. The token is generated in the root loader, stored in a separate `__local` cookie session, and validated in each action via `validateCsrfToken(request)`. Forms include the token automatically using the `<CsrfInput />` component.

## Deployment

This stack comes with two GitHub Actions that handle automatically deploying your app to production and staging environments. By default, Arc will deploy to the `us-west-2` region, if you wish to deploy to a different region, you'll need to change your [`app.arc`](https://arc.codes/docs/en/reference/project-manifest/aws)

Prior to your first deployment, you'll need to do a few things:

- Create a new [GitHub repo](https://repo.new)

- [Sign up](https://portal.aws.amazon.com/billing/signup#/start) and login to your AWS account

- Add `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` to [your GitHub repo's secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets). Go to your AWS [security credentials](https://console.aws.amazon.com/iam/home?region=us-west-2#/security_credentials) and click on the "Access keys" tab, and then click "Create New Access Key", then you can copy those and add them to your repo's secrets.

- Install the [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html#getting-started-install-instructions).

- Create an [AWS credentials file](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-quickstart.html#getting-started-quickstart-new).

### AWS Configuration

Architect uses the `@aws` pragma in `app.arc` and your local `~/.aws/credentials` file to deploy to AWS.

#### Setting the profile and region in `app.arc`

Uncomment and set the `profile` and `region` fields under `@aws` in `app.arc` to match your setup:

```arc
@aws
runtime nodejs22.x
profile default
region us-west-1
```

- **profile** — the name of the credentials profile in `~/.aws/credentials` to use for deployment. Defaults to `default`.
- **region** — the AWS region to deploy to (e.g. `us-west-1`, `us-east-1`, `eu-west-1`).

#### Configuring `~/.aws/credentials`

If you haven't already, create or update `~/.aws/credentials` with your access keys:

```ini
[default]
aws_access_key_id = YOUR_ACCESS_KEY_ID
aws_secret_access_key = YOUR_SECRET_ACCESS_KEY
```

To use a named profile other than `default`, add a new section and update `app.arc` to match:

```ini
[my-profile]
aws_access_key_id = YOUR_ACCESS_KEY_ID
aws_secret_access_key = YOUR_SECRET_ACCESS_KEY
```

```arc
@aws
profile my-profile
region us-west-2
```

You can create access keys from the [AWS IAM console](https://console.aws.amazon.com/iam/home#/security_credentials). For more details, see the [AWS CLI configuration guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-quickstart.html#getting-started-quickstart-new).

- Along with your AWS credentials, you'll also need to give your CloudFormation a `SESSION_SECRET` variable of its own for both staging and production environments, as well as an `ARC_APP_SECRET` for Arc itself.

  ```sh
  npx arc env --add --env staging ARC_APP_SECRET $(openssl rand -hex 32)
  npx arc env --add --env staging SESSION_SECRET $(openssl rand -hex 32)
  npx arc env --add --env production ARC_APP_SECRET $(openssl rand -hex 32)
  npx arc env --add --env production SESSION_SECRET $(openssl rand -hex 32)
  ```

  If you don't have openssl installed, you can also use [1password](https://1password.com/password-generator) to generate a random secret, just replace `$(openssl rand -hex 32)` with the generated secret.

## Where do I find my CloudFormation?

You can find the CloudFormation template that Architect generated for you in the sam.yaml file.

To find it on AWS, you can search for [CloudFormation](https://console.aws.amazon.com/cloudformation/home) (make sure you're looking at the correct region!) and find the name of your stack (the name is a PascalCased version of what you have in `app.arc`, so by default it's ReactRouterGrungeStackStaging and ReactRouterGrungeStackProduction) that matches what's in `app.arc`, you can find all of your app's resources under the "Resources" tab.

## GitHub Actions

We use GitHub Actions for continuous integration and deployment. Anything that gets into the `main` branch will be deployed to production after running tests/build/etc. Anything in the `dev` branch will be deployed to staging.

## Testing

### Cypress

We use Cypress for our End-to-End tests in this project. You'll find those in the `cypress` directory. As you make changes, add to an existing file or create a new file in the `cypress/e2e` directory to test your changes.

We use [`@testing-library/cypress`](https://testing-library.com/cypress) for selecting elements on the page semantically.

To run these tests in development, run `npm run test:e2e:dev` which will start the dev server for the app as well as the Cypress client. Make sure the database is running in docker as described above.

We have a utility for testing authenticated features without having to go through the login flow:

```ts
cy.login();
// you are now logged in as a new user
```

### Vitest

For lower level tests of utilities and individual components, we use `vitest`. We have DOM-specific assertion helpers via [`@testing-library/jest-dom`](https://testing-library.com/jest-dom).

### Type Checking

This project uses TypeScript. It's recommended to get TypeScript set up for your editor to get a really great in-editor experience with type checking and auto-complete. To run type checking across the whole project, run `npm run typecheck`.

### Linting

This project uses ESLint for linting. That is configured in `.eslintrc.cjs`.

### Formatting

We use [Prettier](https://prettier.io/) for auto-formatting in this project. It's recommended to install an editor plugin (like the [VSCode Prettier plugin](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)) to get auto-formatting on save. There's also a `npm run format` script you can run to format all files in the project.
