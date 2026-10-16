import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
const port = Number(process.argv[2] ?? process.env.SHARECOMMUTE_PORT ?? 5173);
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error("Choose a ShareCommute port between 1024 and 65535.");
}
if (existsSync(".env")) process.loadEnvFile(".env");
const children = [];
let closing = false;
function stop(code = 0) {
  if (closing) return;
  closing = true;
  for (const child of children) child.kill();
  process.exitCode = code;
}
for (const args of [
  ["--experimental-strip-types", "server/index.ts"],
  [
    "node_modules/vite/bin/vite.js",
    "--host",
    "127.0.0.1",
    "--port",
    String(port),
    "--strictPort",
  ],
]) {
  const child = spawn(process.execPath, args, {
    stdio: "inherit",
    env: { ...process.env, SHARECOMMUTE_PORT: String(port) },
  });
  children.push(child);
  child.on("error", () => stop(1));
  child.on("exit", (code) => {
    if (!closing) stop(code ?? 1);
  });
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
