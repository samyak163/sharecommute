"use client";
import { useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  MapPin,
  Ticket,
  Users,
} from "lucide-react";
import { bookingCalendar } from "@/lib/booking-calendar";
import { bookingReference } from "@/lib/booking-view";
import {
  bookingShare,
  dayLabel,
  money,
  place,
  timeLabel,
  type Booking,
  type CommuteState,
  type Ride,
} from "@/lib/commute";
import { directionsUrl } from "@/lib/map-routes";

export default function BookingTicket({
  booking,
  ride,
  state,
  onRides,
  onDetails,
}: {
  booking: Booking;
  ride: Ride;
  state: CommuteState;
  onRides: () => void;
  onDetails: () => void;
}) {
  const [downloaded, setDownloaded] = useState(false),
    [error, setError] = useState("");
  const cancelled = booking.status !== "confirmed" || ride.status !== "open";
  const past = new Date(ride.departure).getTime() <= Date.now();
  function download() {
    try {
      const calendar = bookingCalendar(ride, booking);
      const url = URL.createObjectURL(
        new Blob([calendar], { type: "text/calendar;charset=utf-8" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `ShareCommute-${bookingReference(booking.id)}.ics`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setDownloaded(true);
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The calendar file could not be created.",
      );
    }
  }
  return (
    <div className="booking-ticket">
      <div className={`ticket-status ${cancelled ? "cancelled" : ""}`}>
        <span>
          {cancelled ? <Ticket size={26} /> : <CheckCircle2 size={30} />}
        </span>
        <div>
          <h3>
            {cancelled
              ? "Booking cancelled"
              : past
                ? "Your past departure"
                : "You’re booked!"}
          </h3>
          <p>
            {cancelled
              ? "Your reserved seats have been released."
              : "Your reservation is saved in My rides."}
          </p>
        </div>
      </div>
      <div className="ticket-card">
        <div className="ticket-reference">
          <span>
            <Ticket size={14} />
            BOOKING REFERENCE
          </span>
          <strong>{bookingReference(booking.id)}</strong>
        </div>
        <div className="ticket-route">
          <p>
            <span>A</span>
            <strong>{place(ride.origin).name}</strong>
          </p>
          <span className="ticket-route-line" />
          <p>
            <span>B</span>
            <strong>{place(ride.destination).name}</strong>
          </p>
        </div>
        <div className="ticket-facts">
          <div>
            <CalendarDays size={17} />
            <span>
              Date<strong>{dayLabel(ride.departure)}</strong>
            </span>
          </div>
          <div>
            <Clock3 size={17} />
            <span>
              Departure<strong>{timeLabel(ride.departure)} IST</strong>
            </span>
          </div>
          <div>
            <Users size={17} />
            <span>
              Reserved
              <strong>
                {booking.seats} {booking.seats === 1 ? "seat" : "seats"}
              </strong>
            </span>
          </div>
          <div>
            <Check size={17} />
            <span>
              Status
              <strong>
                {cancelled
                  ? "Cancelled"
                  : past
                    ? "Past departure"
                    : "Confirmed"}
              </strong>
            </span>
          </div>
        </div>
        <div className="ticket-host">
          <span>
            Host<strong>{ride.host}</strong>
          </span>
          <span>
            Vehicle<strong>{ride.vehicle}</strong>
          </span>
        </div>
        {!cancelled && (
          <div className="ticket-price">
            <div>
              <span>Your current cost share</span>
              <small>May adjust when travellers join or cancel.</small>
            </div>
            <strong>{money(bookingShare(state, ride, booking))}</strong>
          </div>
        )}
      </div>
      <div className="ticket-meeting">
        <MapPin size={17} />
        <div>
          <strong>Where to meet</strong>
          <p>
            {ride.note ||
              `Meet at ${place(ride.origin).name}. Confirm the exact spot with your host.`}
          </p>
        </div>
      </div>
      {!cancelled && !past && (
        <div className="ticket-utilities">
          <a
            className="button secondary"
            href={directionsUrl(ride.origin, ride.destination)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink size={15} />
            Open directions
          </a>
          <button type="button" className="button secondary" onClick={download}>
            <Download size={15} />
            {downloaded ? "Download again" : "Add to calendar"}
          </button>
        </div>
      )}
      {downloaded && (
        <p className="ticket-calendar-result" role="status">
          <Check size={13} />
          Calendar file prepared. Open it in your calendar app to add the pickup
          reminder.
        </p>
      )}
      {error && (
        <p className="warning" role="alert">
          {error}
        </p>
      )}
      {!cancelled && !past && (
        <p className="ticket-calendar-hint">
          The calendar file adds a pickup reminder at departure time. It does
          not predict arrival.
        </p>
      )}
      {ride.sample && (
        <p className="booking-sample-note">
          Fictional sample ride for testing. This booking does not arrange real
          travel.
        </p>
      )}
      <div className="ticket-footer">
        <button type="button" className="text-button" onClick={onDetails}>
          Ride details
        </button>
        <button type="button" className="button primary" onClick={onRides}>
          View My rides
          <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}
