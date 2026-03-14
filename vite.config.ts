import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type Plugin } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

function staticAlias(): Plugin {
  return {
    name: "static-alias",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url?.startsWith("/_static/")) {
          req.url = req.url.replace("/_static/", "/");
        }
        next();
      });
    },
  };
}

export default defineConfig(({ command }) => ({
  base: command === "build" ? "/_static/" : undefined,
  plugins: [
    tailwindcss(),
    staticAlias(),
    reactRouter(),
    tsconfigPaths(),
  ],
  esbuild: {
    logOverride: { "css-syntax-error": "silent" },
  },
  optimizeDeps: {
    include: [
      "react",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "react-dom",
      "react-dom/client",
      "react-router",
    ],
    exclude: ["@architect/functions"],
  },
  ssr: {
    noExternal: command === "build" ? true : undefined,
    external: [
      "@architect/functions",
      "@aws-sdk/client-dynamodb",
      "@aws-sdk/lib-dynamodb",
      "@smithy/node-http-handler",
      "aws-sdk",
      "@aws-lite/client",
      "bcryptjs",
    ],
  },
}));
