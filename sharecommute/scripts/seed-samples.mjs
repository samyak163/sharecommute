import { existsSync } from "node:fs";
import { openDatabase } from "../server/database.ts";
import { createRideService } from "../server/rides.ts";

if (existsSync(".env")) process.loadEnvFile(".env");
const db = openDatabase(
  process.env.DATABASE_PATH ?? "data/sharecommute.sqlite",
);
try {
  const added = createRideService(db).seed();
  const summary = db
    .prepare(
      "SELECT COUNT(*) AS rides, MIN(departure) AS firstDeparture, MAX(departure) AS lastDeparture FROM rides WHERE sample=1 AND status='open' AND departure_ms>?",
    )
    .get(Date.now());
  console.log(JSON.stringify({ addedNewRides: added, ...summary }));
  console.log(
    "Sample rides are ready. Existing offers and bookings were preserved.",
  );
} finally {
  db.close();
}
