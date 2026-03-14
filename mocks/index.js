import { setupServer } from "msw/node";

// put one-off handlers that don't really need an entire file to themselves here
const miscHandlers = [];

const server = setupServer(...miscHandlers);

server.listen({ onUnhandledRequest: "bypass" });
console.info("Mock server running");

process.once("SIGINT", () => server.close());
process.once("SIGTERM", () => server.close());
