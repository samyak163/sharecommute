"use client";
import { useState } from "react";
import {
  Bike,
  CarFront,
  Check,
  ChevronDown,
  Clock3,
  Map,
  MapPin,
  Tag,
  Users,
} from "lucide-react";
import type { RideHighlight } from "@/lib/ride-comparison";
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
  highlights = [],
  onPreview,
  onOpen,
}: {
  ride: Ride;
  state: CommuteState;
  userId: string;
  seats: number;
  index: number;
  selected: boolean;
  highlights?: readonly RideHighlight[];
  onPreview: () => void;
  onOpen: () => void;
}) {
  const [meetingOpen, setMeetingOpen] = useState(false);
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
      {(highlights.length > 0 || booking) && (
        <div className="ride-comparison-badges" aria-label="Ride comparison">
          {booking ? (
            <span className="comparison-badge">
              <Check size={11} />
              Your booking
            </span>
          ) : (
            highlights.map((highlight) => (
              <span
                key={highlight.kind}
                className={`comparison-badge comparison-${highlight.kind}`}
                title={highlight.explanation}
              >
                {highlight.kind === "cost" ? (
                  <Tag size={11} />
                ) : (
                  <Clock3 size={11} />
                )}
                {highlight.label}
                <span className="sr-only">. {highlight.explanation}</span>
              </span>
            ))
          )}
        </div>
      )}
      <div className="ride-person">
        <span className={`avatar avatar-${index % 4}`}>{initials}</span>
        <div>
          <h3>
            {ride.host}
            <span className="role-badge">{ride.role}</span>
          </h3>
          <p>{ride.department}</p>
        </div>
        <div className="card-departure">
          <time dateTime={ride.departure}>{timeLabel(ride.departure)}</time>
          <span className={`type-badge type-${ride.type}`}>
            <Icon size={12} />
            {TYPE_LABELS[ride.type]}
          </span>
        </div>
      </div>
      <div className="ride-body">
        <div className="ride-path">
          <div>
            <span className="path-dot" />
            <div>
              <strong>{place(ride.origin).name}</strong>
              <small className="sr-only">Pickup point</small>
            </div>
          </div>
          <div>
            <span className="path-square" />
            <div>
              <strong>{place(ride.destination).name}</strong>
              <small className="sr-only">
                Drop-off · {place(ride.destination).area}
              </small>
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
            {booking?.seats ?? seats}{" "}
            {(booking?.seats ?? seats) === 1 ? "seat" : "seats"} ·{" "}
            {booking ? "current share" : "estimated"}
          </span>
        </div>
      </div>
      <div className="explorer-ride-meta">
        <span>
          <Users size={13} />
          {available} {available === 1 ? "seat" : "seats"} left
        </span>
        <span className="card-vehicle" title={ride.vehicle}>
          <Icon size={13} />
          <span>{ride.vehicle}</span>
        </span>
        <button
          type="button"
          className="meeting-note-toggle"
          aria-expanded={meetingOpen}
          aria-controls={`meeting-${ride.id}`}
          onClick={(event) => {
            event.stopPropagation();
            setMeetingOpen((value) => !value);
          }}
        >
          <MapPin size={12} />
          {ride.note ? "Meeting note" : "Pickup info"}
          <ChevronDown size={12} />
        </button>
        <p
          id={`meeting-${ride.id}`}
          hidden={!meetingOpen}
          className="card-meeting-note"
          onClick={(event) => event.stopPropagation()}
        >
          <strong>Meet at {place(ride.origin).name}</strong>
          {ride.note ||
            "Confirm the exact meeting spot with your host before travelling."}
        </p>
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
