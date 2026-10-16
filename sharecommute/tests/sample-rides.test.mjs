import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { openDatabase } from "../server/database.ts";
import { createRideService } from "../server/rides.ts";
import { availableSeats, findRides } from "../lib/commute.ts";

function fixture(t) {
  const db = openDatabase(":memory:");
  t.after(() => db.close());
  let now = Date.parse("2026-10-09T00:00:00Z"); // 05:30 IST, before morning rides.
  const user = {
    id: "local-rider",
    email: "local-rider@mitwpu.edu.in",
    name: "Local Rider",
    role: "Student",
    verification: "development",
    isAdmin: false,
  };
  db.prepare(
    "INSERT INTO users(id,email,name,role,verification,created_at) VALUES(?,?,?,?,'development',?)",
  ).run(user.id, user.email, user.name, user.role, now);
  const rides = createRideService(db, () => now);
  return {
    db,
    user,
    rides,
    time: () => now,
    advance: (days) => {
      now += days * 86400000;
    },
  };
}

test("sample rides fill an existing database with morning and evening routes for eight dates", (t) => {
  const { db, user, rides } = fixture(t);
  const own = rides.offer(user, {
    origin: "campus",
    destination: "deccan",
    departure: "2026-10-10T12:00:00+05:30",
    type: "carpool",
    vehicle: "My own car",
    capacity: 4,
    totalPaise: 20000,
    note: "My meeting point",
  });
  const original = db.prepare("SELECT * FROM rides WHERE id=?").get(own.id);
  assert.equal(rides.seed(), true);
  const samples = db.prepare("SELECT * FROM rides WHERE sample=1").all();
  assert.equal(samples.length, 96);
  assert.equal(new Set(samples.map((r) => r.departure.slice(0, 10))).size, 8);
  assert.deepEqual(
    new Set(samples.map((r) => r.type)),
    new Set(["carpool", "cab", "bike"]),
  );
  assert.equal(samples.filter((r) => r.origin === "campus").length, 48);
  assert.equal(samples.filter((r) => r.destination === "campus").length, 48);
  assert.equal(rides.seed(), false);
  assert.equal(
    db.prepare("SELECT COUNT(*) AS count FROM rides WHERE sample=1").get()
      .count,
    96,
  );
  assert.deepEqual(
    db.prepare("SELECT * FROM rides WHERE id=?").get(own.id),
    original,
  );
});

test("a rider can reserve a sample seat, reload it, and cancel without seeding changing availability", (t) => {
  const { user, rides, time } = fixture(t);
  rides.seed();
  const search = {
    origin: "campus",
    destination: "",
    date: "2026-10-10",
    time: "17:00",
    window: 60,
    seats: 1,
  };
  const results = findRides(rides.state(user), search, time(), user.id);
  assert.equal(results.length, 6);
  const bike = results.find((r) => r.type === "bike");
  const booked = rides.book(user, bike.id, {
    seats: 1,
    idempotencyKey: randomUUID(),
  });
  assert.equal(booked.state.bookings[0].status, "confirmed");
  assert.equal(booked.state.bookings[0].sharePaise, 3000);
  rides.seed();
  const reloaded = rides.state(user);
  assert.equal(
    availableSeats(
      reloaded,
      reloaded.rides.find((r) => r.id === bike.id),
    ),
    0,
  );
  assert.ok(
    !findRides(reloaded, search, time(), user.id).some((r) => r.id === bike.id),
  );
  const cancelled = rides.cancelBooking(user, booked.id).state;
  assert.equal(
    availableSeats(
      cancelled,
      cancelled.rides.find((r) => r.id === bike.id),
    ),
    1,
  );
  assert.equal(cancelled.bookings[0].status, "cancelled");
});

test("date rollover adds new samples while preserving past bookings and cancelled sample rides", (t) => {
  const { db, user, rides, advance } = fixture(t);
  rides.seed();
  const sample = rides
    .state(user)
    .rides.find((r) => r.sample && r.departure.startsWith("2026-10-10"));
  const booked = rides.book(user, sample.id, {
    seats: 1,
    idempotencyKey: randomUUID(),
  });
  const record = db.prepare("SELECT * FROM rides WHERE id=?").get(sample.id);
  const cancelledId = db
    .prepare(
      "SELECT id FROM rides WHERE sample=1 AND departure LIKE '2026-10-15%' LIMIT 1",
    )
    .get().id;
  db.prepare("UPDATE rides SET status='cancelled' WHERE id=?").run(cancelledId);
  advance(3);
  assert.equal(rides.seed(), true);
  assert.equal(
    db.prepare("SELECT COUNT(*) AS count FROM rides WHERE sample=1").get()
      .count,
    132,
  );
  assert.deepEqual(
    db.prepare("SELECT * FROM rides WHERE id=?").get(sample.id),
    record,
  );
  assert.equal(
    db.prepare("SELECT status FROM rides WHERE id=?").get(cancelledId).status,
    "cancelled",
  );
  const state = rides.state(user);
  assert.equal(
    state.bookings.find((b) => b.id === booked.id).status,
    "confirmed",
  );
  assert.ok(state.rides.some((r) => r.id === sample.id));
  assert.ok(state.rides.some((r) => r.departure.startsWith("2026-10-19")));
  assert.ok(!state.rides.some((r) => r.departure.startsWith("2026-10-09")));
});
