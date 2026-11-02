"use client";
import { useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  Info,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";
import { bookingPreview } from "@/lib/booking-view";
import {
  dayLabel,
  money,
  place,
  timeLabel,
  type CommuteState,
  type Ride,
} from "@/lib/commute";

export default function BookingReview({
  state,
  ride,
  userId,
  seats,
  pending,
  onSeatsChange,
  onRefresh,
}: {
  state: CommuteState;
  ride: Ride;
  userId: string;
  seats: number;
  pending: boolean;
  onSeatsChange: (seats: number) => void;
  onRefresh: () => Promise<void>;
}) {
  const preview = bookingPreview(state, ride, seats, userId);
  const [refreshing, setRefreshing] = useState(false),
    [refreshError, setRefreshError] = useState("");
  return (
    <div className="booking-review">
      <div className="booking-progress" aria-label="Booking progress">
        <span>1 · Ride details</span>
        <span className="active">2 · Review</span>
        <span>3 · Confirmed</span>
      </div>
      <p className="booking-intro">
        Check your journey and seat count. Your reservation is made when you
        confirm below.
      </p>
      <div className="booking-route-card">
        <div>
          <span className="booking-point">A</span>
          <div>
            <small>PICKUP</small>
            <strong>{place(ride.origin).name}</strong>
          </div>
        </div>
        <div>
          <span className="booking-point destination">B</span>
          <div>
            <small>DROP-OFF</small>
            <strong>{place(ride.destination).name}</strong>
          </div>
        </div>
        <p>
          <CalendarDays size={14} />
          {dayLabel(ride.departure)}
          <Clock3 size={14} />
          {timeLabel(ride.departure)} IST
        </p>
      </div>
      <div className="booking-host-line">
        <span>{ride.host}</span>
        <span>{ride.vehicle}</span>
      </div>
      <div className="booking-seat-row">
        <label>
          <span>
            <Users size={15} />
            Seats to reserve
          </span>
          <select
            aria-label="Seats to reserve"
            value={seats}
            disabled={pending || refreshing || !preview.available}
            onChange={(event) => onSeatsChange(Number(event.target.value))}
          >
            {(seats > preview.available || seats < 1) && (
              <option value={seats} disabled>
                {seats} seats · unavailable
              </option>
            )}
            {Array.from({ length: preview.available }, (_, index) => (
              <option key={index + 1} value={index + 1}>
                {index + 1} {index === 0 ? "seat" : "seats"}
              </option>
            ))}
          </select>
        </label>
        <span>
          {preview.available} {preview.available === 1 ? "seat" : "seats"}{" "}
          available
        </span>
      </div>
      {preview.reason && (
        <p className="warning" role="status">
          {preview.reason}
        </p>
      )}
      {refreshError && (
        <p className="warning" role="alert">
          {refreshError}
        </p>
      )}
      {preview.canConfirm && (
        <section className="booking-cost" aria-label="Booking cost review">
          <div>
            <span>Total journey cost</span>
            <strong>{money(ride.totalPaise)}</strong>
          </div>
          <div>
            <span>Travellers after you join</span>
            <strong>{preview.people}, including the host</strong>
          </div>
          <div>
            <span>Each traveller’s share</span>
            <strong>
              {money(preview.smallestShare!)}
              {preview.smallestShare !== preview.largestShare
                ? ` – ${money(preview.largestShare!)}`
                : ""}
            </strong>
          </div>
          <div className="booking-cost-total">
            <div>
              <span>Your estimated share</span>
              <small>
                For {seats} {seats === 1 ? "seat" : "seats"}
              </small>
            </div>
            <strong>{money(preview.sharePaise!)}</strong>
          </div>
        </section>
      )}
      <div className="booking-meeting">
        <MapPin size={16} />
        <p>
          <strong>Meeting note</strong>
          {ride.note ||
            "Confirm the exact meeting spot with your host before travelling."}
        </p>
      </div>
      <p className="booking-finance-note">
        <Info size={14} />
        The cost is shared equally and may change with occupancy. ShareCommute
        records the share; payment is arranged separately.
      </p>
      {ride.sample && (
        <p className="booking-sample-note">
          Fictional sample ride for local testing. No real journey is arranged.
        </p>
      )}
      <button
        type="button"
        className="booking-refresh text-button"
        disabled={pending || refreshing}
        onClick={async () => {
          setRefreshing(true);
          setRefreshError("");
          try {
            await onRefresh();
          } catch (error) {
            setRefreshError(
              error instanceof Error
                ? error.message
                : "Could not refresh seats.",
            );
          } finally {
            setRefreshing(false);
          }
        }}
      >
        <RefreshCw size={12} />
        {refreshing ? "Refreshing seats…" : "Refresh availability"}
      </button>
    </div>
  );
}

export function BookingReviewFooter({
  state,
  ride,
  userId,
  seats,
  pending,
  onConfirm,
  onBack,
  onExisting,
}: {
  state: CommuteState;
  ride: Ride;
  userId: string;
  seats: number;
  pending: boolean;
  onConfirm: () => Promise<void>;
  onBack: () => void;
  onExisting: (id: string) => void;
}) {
  const preview = bookingPreview(state, ride, seats, userId);
  return (
    <div className="booking-review-actions">
      <button
        type="button"
        className="button secondary"
        disabled={pending}
        onClick={onBack}
      >
        <ArrowLeft size={15} />
        Back
      </button>
      {preview.existing ? (
        <button
          type="button"
          className="button primary"
          onClick={() => onExisting(preview.existing!.id)}
        >
          View your booking
        </button>
      ) : (
        <button
          type="button"
          className="button primary"
          disabled={pending || !preview.canConfirm}
          onClick={() => void onConfirm()}
        >
          <ShieldCheck size={16} />
          <span>
            {pending ? "Reserving your seats…" : "Confirm booking"}
            {preview.canConfirm && !pending && (
              <small>
                {money(preview.sharePaise!)} for {seats}{" "}
                {seats === 1 ? "seat" : "seats"}
              </small>
            )}
          </span>
        </button>
      )}
    </div>
  );
}
