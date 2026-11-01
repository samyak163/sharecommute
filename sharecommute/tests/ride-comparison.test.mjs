import test from "node:test";
import assert from "node:assert/strict";
import { rideHighlights } from "../lib/ride-comparison.ts";
import { initialState } from "../lib/commute.ts";

const state = () => initialState(new Date("2026-10-06T10:00:00Z"));
const search = {
  origin: "campus",
  destination: "",
  date: "2026-10-07",
  time: "17:00",
  window: 60,
  seats: 1,
};
const option = (
  id,
  totalPaise,
  capacity,
  departure = "2026-10-07T17:00:00+05:30",
) => ({
  ...state().rides[0],
  id,
  totalPaise,
  capacity,
  otherPassengers: 0,
  departure,
  origin: "campus",
  destination: "station",
  status: "open",
});
const kinds = (result, id) => (result.get(id) ?? []).map((item) => item.kind);

test("cost badges use total requested-seat shares and recalculate when seat counts change", () => {
  const db = state();
  const rides = [option("two-person", 10000, 2), option("larger", 12000, 4)];
  assert.ok(
    kinds(rideHighlights(db, rides, search, "viewer"), "two-person").includes(
      "cost",
    ),
  );
  // Model a later result set where both rides can accommodate two requested seats.
  rides[0].capacity = 4;
  rides[1].otherPassengers = 1;
  const result = rideHighlights(db, rides, { ...search, seats: 2 }, "viewer");
  assert.ok(kinds(result, "larger").includes("cost"));
  assert.ok(!kinds(result, "two-person").includes("cost"));
});

test("closest departure uses the preferred IST time, allows ties and ignores list order", () => {
  const db = state();
  const rides = [
    option("before", 15000, 4, "2026-10-07T16:45:00+05:30"),
    option("after", 15000, 4, "2026-10-07T17:15:00+05:30"),
    option("later", 15000, 4, "2026-10-07T17:30:00+05:30"),
  ];
  const result = rideHighlights(db, rides, search, "viewer");
  assert.ok(kinds(result, "before").includes("departure"));
  assert.ok(kinds(result, "after").includes("departure"));
  assert.ok(!kinds(result, "later").includes("departure"));
  assert.deepEqual(
    [...rideHighlights(db, [...rides].reverse(), search, "viewer")].sort(),
    [...result].sort(),
  );
  assert.match(
    result.get("before").find((item) => item.kind === "departure").explanation,
    /15 minutes/,
  );
});

test("already reserved rides are not ranked as new reservations and a single alternative gets no comparison badge", () => {
  const db = state();
  db.bookings.push({
    id: "reservation",
    rideId: "reserved",
    userId: "viewer",
    seats: 1,
    status: "confirmed",
    createdAt: "2026-10-06T10:00:00Z",
  });
  const rides = [option("reserved", 100, 4), option("new", 10000, 4)];
  assert.equal(rideHighlights(db, rides, search, "viewer").size, 0);
  assert.ok(
    kinds(
      rideHighlights(db, rides, search, "another-viewer"),
      "reserved",
    ).includes("cost"),
  );
});

test("equal prices share the badge and comparison does not mutate results or state", () => {
  const db = state();
  const rides = [option("a", 9000, 4), option("b", 9000, 4)];
  const before = JSON.stringify({ db, rides });
  const result = rideHighlights(db, rides, search, "viewer");
  assert.ok(kinds(result, "a").includes("cost"));
  assert.ok(kinds(result, "b").includes("cost"));
  assert.equal(JSON.stringify({ db, rides }), before);
  assert.equal(rideHighlights(db, [], search, "viewer").size, 0);
});
