"use client";
import { Bike, CarFront, Check, Map, Users } from "lucide-react";
import {
  TYPE_LABELS,
  availableSeats,
  bookingShare,
  money,
  place,
  quote,
  timeLabel,
  type CommuteState,
  type Ride,
} from "@/lib/commute";

export default function RideResultCard({
  ride,
  state,
  userId,
  seats,
  index,
  selected,
  onPreview,
  onOpen,
}: {
  ride: Ride;
  state: CommuteState;
  userId: string;
  seats: number;
  index: number;
  selected: boolean;
  onPreview: () => void;
  onOpen: () => void;
}) {
  const Icon = ride.type === "bike" ? Bike : CarFront;
  const booking = state.bookings.find(
    (item) =>
      item.rideId === ride.id &&
      item.userId === userId &&
      item.status === "confirmed",
  );
  const available = availableSeats(state, ride);
  const initials = ride.host
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0])
    .join("");
  return (
    <article
      className={`ride-card explorer-ride-card ${selected ? "focused" : ""}`}
      aria-label={`${ride.host}'s ride to ${place(ride.destination).name}`}
      onClick={onPreview}
    >
      <div className="ride-person">
        <span className={`avatar avatar-${index % 4}`}>{initials}</span>
        <div>
          <h3>
            {ride.host}
            <span className="role-badge">{ride.role}</span>
          </h3>
          <p>{ride.department}</p>
        </div>
        <span className={`type-badge type-${ride.type}`}>
          <Icon size={14} />
          {TYPE_LABELS[ride.type]}
        </span>
      </div>
      <div className="ride-body">
        <div className="ride-path">
          <div>
            <span className="path-dot" />
            <div>
              <strong>{place(ride.origin).name}</strong>
              <small>Pickup point</small>
            </div>
            <time dateTime={ride.departure}>{timeLabel(ride.departure)}</time>
          </div>
          <div>
            <span className="path-square" />
            <div>
              <strong>{place(ride.destination).name}</strong>
              <small>Drop-off · {place(ride.destination).area}</small>
            </div>
          </div>
        </div>
        <div className="ride-price">
          <strong>
            {money(
              booking
                ? bookingShare(state, ride, booking)
                : quote(state, ride, seats),
            )}
          </strong>
          <span>
            for {booking?.seats ?? seats}{" "}
            {(booking?.seats ?? seats) === 1 ? "seat" : "seats"}
          </span>
          <small>
            {booking ? "Your current cost share" : "Estimated cost share"}
          </small>
        </div>
      </div>
      <div className="explorer-ride-meta">
        <span>
          <Users size={13} />
          {available} {available === 1 ? "seat" : "seats"} left
        </span>
        <span>
          <Icon size={13} />
          {ride.vehicle}
        </span>
      </div>
      <div className="ride-bottom explorer-ride-actions">
        <button
          type="button"
          className="preview-route-button"
          aria-pressed={selected}
        aria-controls="selected-ride-map"
          aria-label={`Preview ${ride.host}'s route to ${place(ride.destination).name}`}
          onClick={(event) => {
            event.stopPropagation();
            onPreview();
          }}
        >
          {selected ? <Check size={15} /> : <Map size={15} />}
          {selected ? "On the map" : "Preview route"}
        </button>
        <button
          type="button"
          className={`button small ${booking ? "secondary" : "primary"}`}
          onClick={(event) => {
            event.stopPropagation();
            onOpen();
          }}
        >
          {booking ? "View booking" : "View ride"}
        </button>
      </div>
    </article>
  );
}
