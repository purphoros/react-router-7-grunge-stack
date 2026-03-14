import path from "node:path";

import type { RouteConfig } from "@react-router/dev/routes";
import { route } from "@react-router/dev/routes";
import { remixRoutesOptionAdapter } from "@react-router/remix-routes-option-adapter";
import { flatRoutes } from "remix-flat-routes";

const testRoutes: RouteConfig =
  process.env.NODE_ENV !== "production"
    ? [
        route(
          "__tests/create-user",
          path.relative(
            path.join(process.cwd(), "app"),
            "cypress/support/test-routes/create-user.ts",
          ),
        ),
      ]
    : [];

export default [
  ...(await remixRoutesOptionAdapter((defineRoutes) => {
    return flatRoutes("routes", defineRoutes, {
      ignoredRouteFiles: [
        "**/*.css",
        "**/*.test.{js,jsx,ts,tsx}",
        "**/__*.*",
        "**/*.server.*",
        "**/*.client.*",
      ],
    });
  })),
  ...testRoutes,
] satisfies RouteConfig;
