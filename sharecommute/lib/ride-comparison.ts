import {
  departureAt,
  quote,
  timeLabel,
  type CommuteState,
  type Ride,
  type Search,
} from "./commute.ts";

export type RideHighlight = {
  kind: "cost" | "departure";
  label: string;
  explanation: string;
};

/** Compare like-for-like new reservations in the already filtered result set. */
export function rideHighlights(
  state: CommuteState,
  rides: readonly Ride[],
  search: Search,
  userId: string,
) {
  const reserved = new Set(
    state.bookings
      .filter(
        (booking) =>
          booking.userId === userId && booking.status === "confirmed",
      )
      .map((booking) => booking.rideId),
  );
  const options = rides.filter((ride) => !reserved.has(ride.id));
  const result = new Map<string, RideHighlight[]>();
  if (options.length < 2) return result;
  const target = new Date(departureAt(search.date, search.time)).getTime();
  const comparisons = options.map((ride) => ({
    ride,
    cost: quote(state, ride, search.seats),
    difference: Math.abs(new Date(ride.departure).getTime() - target),
  }));
  const lowestCost = Math.min(...comparisons.map((option) => option.cost));
  const nearestDeparture = Math.min(
    ...comparisons.map((option) => option.difference),
  );
  for (const option of comparisons) {
    const highlights: RideHighlight[] = [];
    if (option.cost === lowestCost)
      highlights.push({
        kind: "cost",
        label: "Lowest cost",
        explanation: `Lowest estimated share for ${search.seats} ${search.seats === 1 ? "seat" : "seats"} among these available results. Ties share this label.`,
      });
    if (
      Number.isFinite(nearestDeparture) &&
      option.difference === nearestDeparture
    ) {
      const minutes = Math.round(option.difference / 60_000);
      highlights.push({
        kind: "departure",
        label: "Closest departure",
        explanation:
          minutes === 0
            ? `Matches your preferred ${timeLabel(new Date(target).toISOString())} departure.`
            : `${minutes} ${minutes === 1 ? "minute" : "minutes"} from your preferred ${timeLabel(new Date(target).toISOString())} departure. Ties share this label.`,
      });
    }
    if (highlights.length) result.set(option.ride.id, highlights);
  }
  return result;
}
