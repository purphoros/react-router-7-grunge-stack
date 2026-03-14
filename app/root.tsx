import type { LoaderFunctionArgs } from "react-router";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import { generateCsrfToken } from "~/helpers/security.server";
import { getUser } from "~/session.server";
import stylesheet from "~/tailwind.css?url";

export const links = () => [{ rel: "stylesheet", href: stylesheet }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const [user, { token: csrfToken, cookie: csrfCookie }] = await Promise.all([
    getUser(request),
    generateCsrfToken(request),
  ]);

  return new Response(JSON.stringify({ user, csrfToken }), {
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": csrfCookie,
    },
  });
};

export default function App() {
  return (
    <html lang="en" className="h-full">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="icon" href="/_static/favicon.ico" />
        <Meta />
        <Links />
      </head>
      <body className="h-full">
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
