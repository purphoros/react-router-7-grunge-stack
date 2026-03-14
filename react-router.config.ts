import type { Config } from "@react-router/dev/config";

export default {
  appDirectory: "app",
  serverBuildFile: "server-build.js",
  serverModuleFormat: "esm",
  // Required when deploying behind CloudFront/CDN — React Router 7's built-in
  // origin check compares the Origin header against Host/x-forwarded-host.
  // CloudFront forwards requests with the API Gateway host, causing a mismatch.
  // Add your production domain(s) here to allow actions to work.
  allowedActionOrigins: ["purphoros.dev", "www.purphoros.dev"],
} satisfies Config;
