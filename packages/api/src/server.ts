import { buildApp } from "./app.ts";

const PORT = Number(process.env.API_PORT ?? 4200);

const app = await buildApp();

try {
  await app.listen({ port: PORT, host: "127.0.0.1" });
  console.log(`[failora-api] listening on http://127.0.0.1:${PORT}`);
} catch (err) {
  console.error(err);
  process.exit(1);
}
