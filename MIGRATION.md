# Remix to React Router 7 Migration

This document covers everything that changed when migrating the Grunge Stack from Remix to React Router 7.

## Dependencies

### Removed

- `@remix-run/architect`
- `@remix-run/css-bundle`
- `@remix-run/dev`
- `@remix-run/node`
- `@remix-run/react`
- `autoprefixer`
- `esbuild`
- `postcss`

### Added

- `react-router` (^7.13.1) — core framework
- `@react-router/architect` (^7.13.1) — Architect/AWS Lambda adapter
- `@react-router/node` (^7.13.1) — Node.js utilities
- `@react-router/dev` (^7.13.1) — dev tooling and Vite plugin
- `@react-router/remix-routes-option-adapter` (^7.13.1) — bridge for `remix-flat-routes`
- `remix-flat-routes` (^0.8.5) — flat file-based routing
- `@tailwindcss/vite` (^4.0.0) — Tailwind CSS v4 Vite plugin
- `tailwindcss` upgraded from v3 to v4

---

## Build System

### Remix compiler → Vite

The Remix integrated compiler was replaced with Vite using the `@react-router/dev/vite` plugin.

**Deleted files:**

- `remix.config.js` — replaced by `react-router.config.ts`
- `remix.env.d.ts` — no longer needed
- `plugin-remix.js` — Remix-specific Vite plugin wrapper
- `postcss.config.cjs` — Tailwind v4 uses a Vite plugin instead
- `tailwind.config.ts` — Tailwind v4 uses CSS-based config

**New files:**

- `react-router.config.ts` — React Router 7 config (`appDirectory`, `serverBuildFile`, `serverModuleFormat`)
- `vite.config.ts` — Vite config with `@react-router/dev/vite`, `@tailwindcss/vite`, a custom `staticAlias` middleware for `/_static/` paths, and SSR externals for AWS SDK/bcryptjs

### Build scripts

```diff
- "build": "remix build"
+ "build": "react-router build && cp arc-handler.mjs build/server/index.mjs && cp arc-package.json build/server/package.json"

- "dev": "remix dev --manual -c \"arc sandbox -e testing\""
+ "dev": "run-p dev:*"
+ "dev:arc": "arc sandbox -e testing -q"
+ "dev:vite": "cross-env ARC_ENV=testing ... react-router dev"

- "typecheck": "tsc"
+ "typecheck": "react-router typegen && tsc && tsc -p cypress"
```

The dev server is now split: Arc sandbox runs separately alongside the Vite dev server using `run-p`.

### TypeScript config

- `module`/`target`/`lib`: ES2020 → ES2022
- `moduleResolution`: `node` → `bundler`
- Added `.react-router/types/**/*` to `includes` and `rootDirs` for generated route types
- Added `vite/client` to `types`
- Removed `remix.env.d.ts` from `includes`

---

## Server & Deployment

### Server entry

**Deleted:** `server.ts` (Remix's server entry)

**Added:** `arc-handler.mjs` — minimal handler that wraps `@react-router/architect`'s `createRequestHandler` pointing at the build output (`./server-build.js`).

**Added:** `arc-package.json` — standalone dependency manifest copied into `build/server/` so Lambda has the runtime deps it needs.

### `app.arc`

Updated the server source path to point at React Router's build output.

---

## Entry Points

### `app/entry.client.tsx`

- `RemixBrowser` → `HydratedRouter` from `react-router/dom`

### `app/entry.server.tsx`

- `RemixServer` → `ServerRouter` from `react-router`
- `createReadableStreamFromReadable` now imported from `@react-router/node`
- `EntryContext` type now imported from `react-router`
- Added nonce generation via `generateNonce()` for CSP
- Security headers attached to every response before rendering

---

## Root (`app/root.tsx`)

- All imports changed from `@remix-run/react` → `react-router`
- `LoaderFunctionArgs` imported from `react-router`
- Removed `cssBundleHref` / `@remix-run/css-bundle` — Vite handles CSS bundling
- Removed `LiveReload` component — Vite provides HMR
- Stylesheet import uses Vite's `?url` suffix: `import stylesheet from "~/tailwind.css?url"`
- `LinksFunction` type removed; `links` is now a plain function
- Loader returns `new Response(JSON.stringify(...))` instead of Remix's `json()` helper
- Added CSRF token generation in the loader alongside user fetching

---

## Routing

### Route definitions

**Deleted:** `remix.config.js` route configuration

**Added:** `app/routes.ts` — centralized route config using `remix-flat-routes` via `@react-router/remix-routes-option-adapter`. Test routes (Cypress `create-user`) are conditionally included in non-production.

### Notes routes restructured

The flat dot-delimited route files were converted to folder-based `+` routes:

| Before (Remix) | After (React Router 7) |
|---|---|
| `app/routes/notes.tsx` | `app/routes/notes+/_layout.tsx` |
| `app/routes/notes._index.tsx` | `app/routes/notes+/_index.tsx` |
| `app/routes/notes.new.tsx` | `app/routes/notes+/new.tsx` |
| `app/routes/notes.$noteId.tsx` | `app/routes/notes+/$noteId.tsx` |

### Route file imports

All route files (`_index.tsx`, `join.tsx`, `login.tsx`, `logout.tsx`, notes routes) updated:

- `@remix-run/node` → `react-router` for types (`LoaderFunctionArgs`, `ActionFunctionArgs`, `MetaFunction`)
- `@remix-run/react` → `react-router` for components (`Form`, `Link`, `useActionData`, `useSearchParams`, etc.)
- `json()` → `data()` helper for error/validation responses
- `redirect()` now imported from `react-router`

---

## Session (`app/session.server.ts`)

- `createCookieSessionStorage` and `redirect` now imported from `react-router` instead of `@remix-run/node`
- All function signatures and logic remain the same

---

## Utilities (`app/utils.ts`)

- `useMatches` import changed from `@remix-run/react` → `react-router`
- All utility functions unchanged

---

## Security (New)

### CSP (Content Security Policy)

**Added:** `app/helpers/security.server.ts`

- `generateNonce()` creates a random base64 nonce per request
- `getSecurityHeaders(nonce)` returns a full set of security headers: CSP, HSTS, X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy
- In dev mode, CSP uses `'unsafe-inline'` for script-src (required for Vite's dev server); in production, uses nonce-based `'nonce-<value>'`
- Headers are attached in `entry.server.tsx` before every response

### CSRF Protection

**Added:** `app/helpers/security.server.ts`, `app/local.server.ts`, `app/components/CsrfInput.tsx`, `app/hooks/useCsrfToken.ts`

- `app/local.server.ts` — separate `createCookieSessionStorage` for CSRF tokens (works for authenticated and unauthenticated users)
- `generateCsrfToken(request)` — creates/retrieves a CSRF token from the local session, returns the token and a `Set-Cookie` header
- `validateCsrfToken(request)` — validates the token from form data (`csrf` field) or `x-csrf-token` header against the session
- `CsrfInput` component renders a hidden input with the CSRF token (sourced via `useCsrfToken` hook from root loader data)
- CSRF validation added to `join.tsx`, `login.tsx`, and `logout.tsx` actions
- `CsrfInput` added to all forms in `join.tsx` and `login.tsx`

---

## Styling

- Tailwind CSS v3 → v4
- Removed `postcss.config.cjs` and `tailwind.config.ts`
- Added `@tailwindcss/vite` plugin in `vite.config.ts`
- Tailwind v4 uses CSS-based configuration rather than a JS/TS config file

---

## Testing

### Cypress

- `cypress.config.ts` → `cypress.config.js` (TypeScript → JavaScript)
- Dev port changed from 3000 → 5173 (Vite's default)
- Test port remains 8811
- `cypress/support/test-routes/create-user.ts` updated imports from `@remix-run/node` → `react-router`

### Mocks

- Removed `REMIX_DEV_HTTP_ORIGIN` ping handler from `mocks/index.js` (no longer needed with Vite dev server)

### Vitest

- `test/setup-test-env.ts` updated for React Router compatibility

---

## Ignore Files

### `.gitignore`

- Added `.react-router/` (generated types directory)
- Updated build artifact paths

### `.prettierignore`

- Updated for new build output paths

---

## GitHub Workflows

### Deleted

- `.github/PULL_REQUEST_TEMPLATE.md`
- `.github/dependabot.yml`
- `.github/workflows/format-repo.yml`
- `.github/workflows/lint-repo.yml`
- `.github/workflows/no-response.yml`

### Modified

- `.github/workflows/deploy.yml` — updated for React Router build commands

---

## New Route

- `app/routes/[.]well-known.appspecific.[com.chrome.devtools.json].tsx` — Chrome DevTools JSON endpoint

---

## ESLint

- Updated Node file list in `.eslintrc.cjs` to reference `cypress.config.js` (was `.ts`)
- Updated build path exclusions

---

## Template Init

- `remix.init/index.js` and `remix.init/gitignore` updated for React Router 7 project scaffolding
