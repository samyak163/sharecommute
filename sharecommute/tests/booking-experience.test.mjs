import test from "node:test";
import assert from "node:assert/strict";
import { initialState } from "../lib/commute.ts";
import { bookingCalendar } from "../lib/booking-calendar.ts";
import {
  bookingPreview,
  bookingReference,
  confirmedBooking,
} from "../lib/booking-view.ts";

const now = new Date("2026-11-01T12:00:00Z");
function fixture() {
  const state = initialState(now);
  return {
    state,
    ride: state.rides.find((ride) => ride.id === "sample-avani"),
    userId: "student-test",
  };
}

test("booking review shows the real total, occupied seats and requested-seat share", () => {
  const { state, ride, userId } = fixture();
  const one = bookingPreview(state, ride, 1, userId, now.getTime());
  assert.equal(one.canConfirm, true);
  assert.equal(one.available, 2);
  assert.equal(one.people, 3);
  assert.equal(one.sharePaise, 6000);
  assert.equal(one.smallestShare, 6000);
  assert.equal(one.largestShare, 6000);
  const two = bookingPreview(state, ride, 2, userId, now.getTime());
  assert.equal(two.people, 4);
  assert.equal(two.sharePaise, 9000);
  assert.deepEqual([two.smallestShare, two.largestShare], [4500, 4500]);
});

test("booking review disables unauthenticated, self, past, closed, duplicate and stale seat submissions", () => {
  const { state, ride, userId } = fixture();
  assert.match(
    bookingPreview(state, ride, 1, "", now.getTime()).reason,
    /Sign in/,
  );
  assert.match(
    bookingPreview(
      state,
      { ...ride, ownerId: userId },
      1,
      userId,
      now.getTime(),
    ).reason,
    /host/,
  );
  assert.match(
    bookingPreview(
      state,
      { ...ride, departure: "2026-11-01T01:00:00+05:30" },
      1,
      userId,
      now.getTime(),
    ).reason,
    /departed/,
  );
  assert.match(
    bookingPreview(
      state,
      { ...ride, status: "cancelled" },
      1,
      userId,
      now.getTime(),
    ).reason,
    /cancelled/,
  );
  state.bookings.push({
    id: "prior-booking",
    rideId: ride.id,
    userId,
    seats: 1,
    status: "confirmed",
    createdAt: now.toISOString(),
  });
  assert.match(
    bookingPreview(state, ride, 1, userId, now.getTime()).reason,
    /already have .*booking/,
  );
  const second = fixture();
  assert.match(
    bookingPreview(second.state, second.ride, 3, second.userId, now.getTime())
      .reason,
    /Only 2 seats/,
  );
  assert.equal(
    bookingPreview(second.state, second.ride, 0, second.userId, now.getTime())
      .canConfirm,
    false,
  );
});

test("booking receipt must match the server confirmed booking, account, ride and seat count", () => {
  const { state, ride, userId } = fixture();
  const booking = {
    id: "04c8be39-4c3c-4683-b000-6ac15a8bdaf4",
    rideId: ride.id,
    userId,
    seats: 2,
    status: "confirmed",
    createdAt: now.toISOString(),
  };
  state.bookings.push(booking);
  assert.equal(
    confirmedBooking(state, booking.id, ride.id, userId, 2),
    booking,
  );
  assert.throws(
    () => confirmedBooking(state, booking.id, ride.id, userId, 1),
    /confirmed booking/,
  );
  assert.throws(
    () => confirmedBooking(state, booking.id, ride.id, "another-user", 2),
    /confirmed booking/,
  );
  assert.equal(bookingReference(booking.id), "SC-04C8BE39");
});

test("calendar pickup reminder uses the booked departure, UTC, directions and a 15-minute alert", () => {
  const { ride, userId } = fixture();
  const booking = {
    id: "04c8be39-4c3c-4683-b000-6ac15a8bdaf4",
    rideId: ride.id,
    userId,
    seats: 2,
    status: "confirmed",
    createdAt: now.toISOString(),
  };
  const content = bookingCalendar(ride, booking, now);
  const unfolded = content.replace(/\r\n /g, "");
  assert.match(content, /BEGIN:VCALENDAR\r\nVERSION:2\.0/);
  assert.match(content, /DTSTART:20261102T113000Z/);
  assert.match(content, /DURATION:PT15M/);
  assert.match(content, /BEGIN:VALARM\r\nACTION:DISPLAY\r\nTRIGGER:-PT15M/);
  assert.match(content, /Booking SC-04C8BE39/);
  assert.match(unfolded, /fictional sample ride for local testing/);
  assert.match(unfolded, /https:\/\/www\.google\.com\/maps\/dir/);
  assert.match(
    unfolded,
    /This is a pickup reminder at the booked departure time/,
  );
  assert.equal(content.endsWith("END:VCALENDAR\r\n"), true);
  for (const line of content.split("\r\n").filter(Boolean))
    assert.ok(
      Buffer.byteLength(line, "utf8") <= 75,
      `iCalendar line exceeds 75 bytes (${Buffer.byteLength(line, "utf8")})`,
    );
});

test("calendar escapes user text, rejects cancelled and departed bookings and folds long unicode lines safely", () => {
  const { ride, userId } = fixture();
  const booking = {
    id: "04c8be39-4c3c-4683-b000-6ac15a8bdaf4",
    rideId: ride.id,
    userId,
    seats: 1,
    status: "confirmed",
    createdAt: now.toISOString(),
  };
  const escaped = bookingCalendar(
    { ...ride, note: "Gate; west, near\\pillar\nMeet here" },
    booking,
    now,
  );
  assert.match(escaped, /Gate\\; west\\, near\\\\pillar\\nMeet here/);
  assert.throws(
    () => bookingCalendar(ride, { ...booking, status: "cancelled" }, now),
    /confirmed booking/,
  );
  assert.throws(
    () =>
      bookingCalendar(
        { ...ride, departure: "2026-11-01T10:00:00Z" },
        booking,
        now,
      ),
    /already departed/,
  );
  const longNote = `Pune ${"विश्वविद्यालय ".repeat(24)}`;
  const folded = bookingCalendar({ ...ride, note: longNote }, booking, now);
  for (const line of folded.split("\r\n").filter(Boolean))
    assert.ok(Buffer.byteLength(line, "utf8") <= 75);
  assert.ok(folded.includes("\r\n "));
});
