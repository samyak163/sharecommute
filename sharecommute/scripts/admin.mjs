import { existsSync } from "node:fs";
import { openDatabase } from "../server/database.ts";
if (existsSync(".env")) process.loadEnvFile(".env");
const [action, email] = process.argv.slice(2);
if (!["grant", "revoke"].includes(action) || !email) {
  console.error("Usage: npm run admin -- grant|revoke email@mitwpu.edu.in");
  process.exit(1);
}
const db = openDatabase(
  process.env.DATABASE_PATH ?? "data/sharecommute.sqlite",
);
try {
  const user = db
    .prepare(
      "SELECT id FROM users WHERE email=? AND verification<>'sample' AND suspended=0",
    )
    .get(email.toLowerCase());
  if (!user)
    throw new Error(
      "Sign in once first with this institutional email, then run the command again.",
    );
  db.prepare("UPDATE users SET is_admin=? WHERE id=?").run(
    action === "grant" ? 1 : 0,
    user.id,
  );
  console.log(
    action === "grant"
      ? "Local administrator access granted. Refresh the website."
      : "Local administrator access removed.",
  );
} finally {
  db.close();
}
