import test from "node:test";
import assert from "node:assert/strict";
import {
  initialState,
  splitFare,
  availableSeats,
  reserve,
  cancelBooking,
  cancelOffer,
  addOffer,
  findRides,
  quote,
  bookingShare,
  DEMO_USER,
} from "../lib/commute.ts";

const now = new Date("2026-10-06T10:00:00Z");
const fresh = () => initialState(now);
const search = {
  origin: "campus",
  destination: "",
  date: "2026-10-07",
  time: "17:00",
  window: 60,
  seats: 1,
};
test("fare allocations conserve every paise and differ by at most one paise", () => {
  for (const total of [0, 1, 999, 10000, 10001, 500000])
    for (let people = 1; people <= 7; people++) {
      const shares = splitFare(total, people);
      assert.equal(
        shares.reduce((a, b) => a + b, 0),
        total,
      );
      assert.ok(Math.max(...shares) - Math.min(...shares) <= 1);
    }
  assert.throws(() => splitFare(-1, 3));
  assert.throws(() => splitFare(100, 0));
  assert.throws(() => splitFare(1.5, 2));
});
test("search respects exact landmarks, date and an inclusive departure window", () => {
  assert.equal(findRides(fresh(), search, +now).length, 6);
  const narrow = findRides(fresh(), { ...search, window: 15 }, +now);
  assert.deepEqual(
    narrow.map((r) => r.host),
    ["Avani Deshmukh", "Rohan Kulkarni", "Aryan Shah"],
  );
  assert.equal(
    findRides(fresh(), { ...search, destination: "baner" }, +now).length,
    1,
  );
  assert.equal(
    findRides(fresh(), { ...search, date: "2026-10-08" }, +now).length,
    0,
  );
  assert.equal(
    findRides(fresh(), search, +new Date("2026-10-08T12:00:00Z")).length,
    0,
  );
});
test("last-seat booking removes a full ride from discovery", () => {
  const s = fresh(),
    ride = s.rides.find((r) => r.type === "bike");
  assert.equal(availableSeats(s, ride), 1);
  const next = reserve(s, ride.id, 1, "booking-last", +now);
  assert.equal(availableSeats(next, ride), 0);
  assert.ok(!findRides(next, search, +now).some((r) => r.id === ride.id));
  assert.equal(s.bookings.length, 0);
});
test("oversized and duplicate reservations are rejected without changing state", () => {
  const s = fresh(),
    r = s.rides[0];
  assert.throws(() => reserve(s, r.id, 3, "too-many", +now), /not enough/);
  assert.throws(() => reserve(s, r.id, 0, "zero", +now), /not enough/);
  const next = reserve(s, r.id, 1, "one", +now);
  assert.throws(
    () => reserve(next, r.id, 1, "duplicate", +now),
    /already have/,
  );
  assert.equal(next.bookings.length, 1);
});
test("quoted multi-seat cost equals the confirmed current cost share", () => {
  const s = fresh(),
    r = s.rides[0],
    estimate = quote(s, r, 2);
  const next = reserve(s, r.id, 2, "two-seats", +now);
  assert.equal(bookingShare(next, r, next.bookings[0]), estimate);
  assert.equal(availableSeats(next, r), 0);
});
test("cancelling restores seats and allows a new reservation", () => {
  const s = fresh(),
    r = s.rides[0],
    next = reserve(s, r.id, 1, "first", +now);
  const cancelled = cancelBooking(next, "first");
  assert.equal(availableSeats(cancelled, r), availableSeats(s, r));
  assert.equal(cancelled.bookings[0].status, "cancelled");
  assert.equal(
    reserve(cancelled, r.id, 1, "second", +now).bookings.filter(
      (b) => b.status === "confirmed",
    ).length,
    1,
  );
  assert.throws(() => cancelBooking(cancelled, "first"), /already cancelled/);
});
test("past, cancelled and self-owned rides cannot be booked", () => {
  const s = fresh(),
    r = s.rides[0];
  assert.throws(
    () => reserve(s, r.id, 1, "past", +new Date("2026-10-08T12:00:00Z")),
    /no longer/,
  );
  assert.throws(
    () =>
      reserve(
        { ...s, rides: [{ ...r, status: "cancelled" }] },
        r.id,
        1,
        "closed",
        +now,
      ),
    /no longer/,
  );
  assert.throws(
    () =>
      reserve(
        { ...s, rides: [{ ...r, ownerId: DEMO_USER }] },
        r.id,
        1,
        "self",
        +now,
      ),
    /own ride/,
  );
});
test("offer validation rejects impossible routes, fares and vehicle capacities", () => {
  const s = fresh(),
    offer = {
      ...s.rides[0],
      id: "my-offer",
      ownerId: DEMO_USER,
      host: "You",
      otherPassengers: 0,
      sample: false,
    };
  assert.equal(addOffer(s, offer, +now).rides[0].id, "my-offer");
  assert.throws(
    () => addOffer(s, { ...offer, destination: offer.origin }, +now),
    /different/,
  );
  assert.throws(
    () => addOffer(s, { ...offer, departure: "invalid" }, +now),
    /future/,
  );
  assert.throws(
    () => addOffer(s, { ...offer, type: "bike", capacity: 4 }, +now),
    /travellers/,
  );
  assert.throws(
    () => addOffer(s, { ...offer, totalPaise: 500001 }, +now),
    /journey cost/,
  );
});
test("offer cancellation checks ownership and closes associated reservations", () => {
  const s = fresh(),
    ride = {
      ...s.rides[0],
      id: "my-offer",
      ownerId: DEMO_USER,
      otherPassengers: 0,
      sample: false,
    };
  assert.throws(() => cancelOffer(s, s.rides[0].id), /your own/);
  const withOffer = addOffer(s, ride, +now);
  const withPassenger = {
    ...withOffer,
    bookings: [
      {
        id: "peer",
        rideId: ride.id,
        userId: "another-student",
        seats: 1,
        status: "confirmed",
        createdAt: now.toISOString(),
      },
    ],
  };
  const next = cancelOffer(withPassenger, ride.id);
  assert.equal(next.rides[0].status, "cancelled");
  assert.equal(next.bookings[0].status, "cancelled");
});
