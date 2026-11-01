import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { openDatabase } from "./database.ts";
import { createApp } from "./app.ts";
import { createMailer } from "./resend-mailer.ts";
import { indiaDate } from "../lib/commute.ts";

if (existsSync(".env")) process.loadEnvFile(".env");
const port = Number(process.env.API_PORT ?? 3001);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error("API_PORT must be an integer between 1024 and 65535.");
const domains = (process.env.ALLOWED_EMAIL_DOMAINS ?? "mitwpu.edu.in")
  .split(",")
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);
if (!domains.length)
  throw new Error("Configure at least one allowed email domain.");
mkdirSync("data", { recursive: true });
const secretPath = resolve("data/auth-secret");
if (!existsSync(secretPath))
  writeFileSync(secretPath, randomBytes(32).toString("hex"), {
    flag: "wx",
    mode: 0o600,
  });
const secret = readFileSync(secretPath, "utf8").trim();
const db = openDatabase(
  process.env.DATABASE_PATH ?? "data/sharecommute.sqlite",
);
const mailer = createMailer({
  apiKey: process.env.RESEND_API_KEY,
  from: process.env.EMAIL_FROM,
});
if (!mailer.available)
  console.error(
    "Email verification is disabled until RESEND_API_KEY and EMAIL_FROM on a verified Resend domain are configured. Local-code sign-in is not available.",
  );
const { server, rides } = createApp(db, {
  secret,
  domains,
  mailer,
  origins: [
    `http://127.0.0.1:${process.env.SHARECOMMUTE_PORT ?? 5173}`,
    `http://localhost:${process.env.SHARECOMMUTE_PORT ?? 5173}`,
    `http://127.0.0.1:${port}`,
    `http://localhost:${port}`,
  ],
  staticDirectory: "dist",
});
const seedSamples = process.env.SEED_SAMPLE_RIDES !== "false";
let sampleDate = "";
function refreshSampleRides() {
  const date = indiaDate();
  if (seedSamples && sampleDate !== date) {
    rides.seed();
    sampleDate = date;
  }
}
refreshSampleRides();
rides.generateScheduled();
const scheduleTimer = setInterval(() => {
  try {
    refreshSampleRides();
    rides.generateScheduled();
  } catch {
    console.error(
      "Recurring ride generation failed; it will retry in one minute.",
    );
  }
}, 60000);
server.listen(port, "127.0.0.1", () =>
  console.log(
    `ShareCommute API: http://127.0.0.1:${port}\nMail delivery: ${mailer.mode}\nDatabase: local SQLite`,
  ),
);
const shutdown = () => {
  clearInterval(scheduleTimer);
  server.close(() => {
    db.close();
    process.exit(0);
  });
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
