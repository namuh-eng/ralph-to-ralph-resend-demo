import app from "./index";

const DEFAULT_PORT = 3016;
const DEFAULT_HOST = "0.0.0.0";

const rawPort = Bun.env.PORT ?? process.env.PORT;
const parsedPort = rawPort ? Number(rawPort) : DEFAULT_PORT;
const port = Number.isFinite(parsedPort) ? parsedPort : DEFAULT_PORT;
const hostname = Bun.env.HOST ?? process.env.HOST ?? DEFAULT_HOST;

const server = Bun.serve({
  fetch: app.fetch,
  hostname,
  port,
});

console.log(`namuh-ingester listening on http://${hostname}:${server.port}`);
