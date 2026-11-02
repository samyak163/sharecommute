"use client";
import { ArrowRight, Check, Info } from "lucide-react";
import { bookingPreview } from "@/lib/booking-view";
import {
  bookingShare,
  money,
  passengerSeats,
  splitFare,
  type CommuteState,
  type Ride,
} from "@/lib/commute";

export default function RideReservationBar({
  state,
  ride,
  userId,
  seats,
  pending,
  onSeatsChange,
  onReview,
  onBooking,
}: {
  state: CommuteState;
  ride: Ride;
  userId: string;
  seats: number;
  pending: boolean;
  onSeatsChange: (seats: number) => void;
  onReview: () => void;
  onBooking: (id: string) => void;
}) {
  const preview = bookingPreview(state, ride, seats, userId);
  if (preview.existing)
    return (
      <div className="reservation-existing">
        <p>
          <Check size={16} />
          You have {preview.existing.seats}{" "}
          {preview.existing.seats === 1 ? "seat" : "seats"} reserved.
          <strong>{money(bookingShare(state, ride, preview.existing))}</strong>
        </p>
        <button
          type="button"
          className="button primary full"
          onClick={() => onBooking(preview.existing!.id)}
        >
          View your booking
          <ArrowRight size={15} />
        </button>
      </div>
    );
  if (ride.ownerId === userId)
    return (
      <div className="reservation-existing">
        <p>
          You are the host.
          <strong>
            {money(
              splitFare(ride.totalPaise, 1 + passengerSeats(state, ride))[0],
            )}{" "}
            current share
          </strong>
        </p>
        <small>
          {money(ride.totalPaise)} total journey cost ·{" "}
          {1 + passengerSeats(state, ride)} travellers
        </small>
      </div>
    );
  if (
    preview.available === 0 ||
    ride.status !== "open" ||
    new Date(ride.departure).getTime() <= Date.now()
  )
    return (
      <p className="inline-note">
        <Info size={16} />
        {preview.reason || "This ride is unavailable."}
      </p>
    );
  return (
    <div className="reservation-bar">
      <label>
        <span>Seats</span>
        <select
          aria-label="Seats to book"
          value={seats}
          disabled={pending}
          onChange={(event) => onSeatsChange(Number(event.target.value))}
        >
          {seats > preview.available && (
            <option value={seats} disabled>
              {seats} · unavailable
            </option>
          )}
          {Array.from({ length: preview.available }, (_, index) => (
            <option key={index + 1} value={index + 1}>
              {index + 1} {index === 0 ? "seat" : "seats"}
            </option>
          ))}
        </select>
      </label>
      <div className="reservation-price">
        <strong>
          {preview.sharePaise === null ? "—" : money(preview.sharePaise)}
        </strong>
        <span>Estimated share</span>
      </div>
      <button
        type="button"
        className="button primary"
        disabled={pending || !preview.canConfirm}
        onClick={onReview}
      >
        Review booking
        <ArrowRight size={15} />
      </button>
    </div>
  );
}
