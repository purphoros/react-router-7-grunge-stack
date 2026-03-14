import { createRequestHandler } from "@react-router/architect";
import * as build from "./server-build.js";

export const handler = createRequestHandler({
  build,
  mode: process.env.NODE_ENV,
});
