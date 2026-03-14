import crypto from "node:crypto";

import { getLocalSession, localSessionStorage } from "~/local.server";

// ── Security Headers ──────────────────────────────────────────────────────────

const isDev = process.env.NODE_ENV !== "production";

export function getSecurityHeaders(nonce: string): Record<string, string> {
  return {
    // CSP with nonces is incompatible with Vite's dev server inline scripts.
    // In dev, use a permissive policy; in production, enforce the strict one.
    "Content-Security-Policy": isDev ? getDevCSP() : getCSP(nonce),
    "Strict-Transport-Security":
      "max-age=63072000; includeSubDomains; preload",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  };
}

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

function getCSP(nonce: string): string {
  return buildCSP(`'nonce-${nonce}'`);
}

function getDevCSP(): string {
  return buildCSP(`'unsafe-inline'`);
}

export function generateNonce(): string {
  return crypto.randomBytes(16).toString("base64");
}

// ── CSRF Protection ───────────────────────────────────────────────────────────
// Uses the cookie-based local session (not the main session)
// so it works for both authenticated and unauthenticated users.

const CSRF_TOKEN_KEY = "csrfToken";

export async function generateCsrfToken(
  request: Request,
): Promise<{ token: string; cookie: string }> {
  const session = await getLocalSession(request);
  let token = session.get(CSRF_TOKEN_KEY);

  if (!token) {
    token = crypto.randomBytes(32).toString("hex");
    session.set(CSRF_TOKEN_KEY, token);
  }

  const cookie = await localSessionStorage.commitSession(session);
  return { token, cookie };
}

export async function validateCsrfToken(request: Request): Promise<void> {
  if (request.method === "GET" || request.method === "HEAD") return;

  const session = await getLocalSession(request);
  const sessionToken = session.get(CSRF_TOKEN_KEY);

  if (!sessionToken) {
    throw new Response("Missing CSRF session token", { status: 403 });
  }

  const contentType = request.headers.get("Content-Type") || "";
  let formToken: string | null = null;

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const cloned = request.clone();
    const formData = await cloned.formData();
    formToken = formData.get("csrf") as string | null;
  }

  // Also check header (for fetch/fetcher requests)
  if (!formToken) {
    formToken = request.headers.get("x-csrf-token");
  }

  if (!formToken || formToken !== sessionToken) {
    throw new Response("Invalid CSRF token", { status: 403 });
  }
}
