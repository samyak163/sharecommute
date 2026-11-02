import {
  availableSeats,
  passengerSeats,
  quote,
  splitFare,
  type CommuteState,
  type Ride,
} from "./commute.ts";

export const bookingReference = (id: string) =>
  `SC-${id.slice(0, 8).toUpperCase()}`;

export function bookingPreview(
  state: CommuteState,
  ride: Ride,
  seats: number,
  userId: string,
  now = Date.now(),
) {
  const available = availableSeats(state, ride);
  const existing = state.bookings.find(
    (booking) =>
      booking.rideId === ride.id &&
      booking.userId === userId &&
      booking.status === "confirmed",
  );
  const reason = !userId
    ? "Sign in to reserve seats."
    : ride.status !== "open"
      ? "This ride has been cancelled."
      : !Number.isFinite(new Date(ride.departure).getTime()) ||
          new Date(ride.departure).getTime() <= now
        ? "This ride has already departed or has an invalid departure time."
        : ride.ownerId === userId
          ? "You are the host of this ride."
          : existing
            ? "You already have a confirmed booking on this ride."
            : available === 0
              ? "No seats are currently available."
              : !Number.isSafeInteger(seats) || seats < 1 || seats > available
                ? `Only ${available} ${available === 1 ? "seat is" : "seats are"} available. Choose an available seat count.`
                : "";
  const people = 1 + passengerSeats(state, ride) + (reason ? 0 : seats);
  const shares = !reason ? splitFare(ride.totalPaise, people) : [];
  return {
    available,
    existing,
    reason,
    canConfirm: !reason,
    people,
    sharePaise: reason ? null : quote(state, ride, seats),
    smallestShare: shares.at(-1) ?? null,
    largestShare: shares[0] ?? null,
  };
}

/** A successful HTTP response alone is not a booking ticket. Validate its actual receipt. */
export function confirmedBooking(
  state: CommuteState,
  id: string,
  rideId: string,
  userId: string,
  seats: number,
) {
  const booking = state.bookings.find(
    (item) =>
      item.id === id &&
      item.rideId === rideId &&
      item.userId === userId &&
      item.status === "confirmed" &&
      item.seats === seats,
  );
  const ride = state.rides.find(
    (item) => item.id === rideId && item.status === "open",
  );
  if (!booking || !ride)
    throw new Error(
      "The server did not return a confirmed booking. Refresh availability and try again.",
    );
  return booking;
}
