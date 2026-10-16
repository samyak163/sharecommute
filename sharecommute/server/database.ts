import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const migrationsDirectory = fileURLToPath(
  new URL("./migrations/", import.meta.url),
);

export function transaction<T>(db: DatabaseSync, operation: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = operation();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function openDatabase(path: string) {
  if (path !== ":memory:")
    mkdirSync(dirname(resolve(path)), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(
    "PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL;",
  );
  db.exec(
    "CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at INTEGER NOT NULL)",
  );
  for (const name of readdirSync(migrationsDirectory)
    .filter((name) => name.endsWith(".sql"))
    .sort()) {
    const sql = readFileSync(resolve(migrationsDirectory, name), "utf8");
    const checksum = createHash("sha256").update(sql).digest("hex");
    const applied = db
      .prepare("SELECT checksum FROM schema_migrations WHERE name = ?")
      .get(name);
    if (applied) {
      if (applied.checksum !== checksum)
        throw new Error(
          `Applied migration ${name} changed. Add a new migration instead.`,
        );
      continue;
    }
    transaction(db, () => {
      db.exec(sql);
      db.prepare("INSERT INTO schema_migrations VALUES (?, ?, ?)").run(
        name,
        checksum,
        Date.now(),
      );
    });
  }
  db.exec("PRAGMA optimize");
  return db;
}
