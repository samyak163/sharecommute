import { place, type Booking, type Ride } from "./commute.ts";
import { directionsUrl } from "./map-routes.ts";
import { bookingReference } from "./booking-view.ts";

function escapeText(value: string) {
  return value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}
function utc(value: Date) {
  if (!Number.isFinite(value.getTime()))
    throw new Error("The ride has an invalid departure time.");
  return value
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}
/** RFC 5545 folds physical lines at 75 UTF-8 octets, including continuation whitespace. */
function fold(line: string) {
  const encoder = new TextEncoder();
  const lines: string[] = [];
  let part = "",
    size = 0;
  for (const character of line) {
    const bytes = encoder.encode(character).length;
    if (size + bytes > 75) {
      lines.push(part);
      part = " ";
      size = 1;
    }
    part += character;
    size += bytes;
  }
  lines.push(part);
  return lines.join("\r\n");
}

/** A point-in-time pickup reminder; no unsupported arrival estimate is added. */
export function bookingCalendar(
  ride: Ride,
  booking: Booking,
  now = new Date(),
) {
  if (
    booking.status !== "confirmed" ||
    ride.status !== "open" ||
    booking.rideId !== ride.id
  )
    throw new Error(
      "Calendar reminders require a confirmed booking on an available ride.",
    );
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(booking.id))
    throw new Error("The booking reference is invalid.");
  const departure = new Date(ride.departure);
  if (
    !Number.isFinite(departure.getTime()) ||
    departure.getTime() <= now.getTime()
  )
    throw new Error(
      "This ride has already departed or has an invalid departure time.",
    );
  const origin = place(ride.origin),
    destination = place(ride.destination);
  const description = [
    `Booking ${bookingReference(booking.id)} · ${booking.seats} ${booking.seats === 1 ? "seat" : "seats"}.`,
    `Pickup: ${origin.name}. Destination: ${destination.name}.`,
    `Host: ${ride.host}. Vehicle: ${ride.vehicle}.`,
    ride.note ||
      "Confirm the exact meeting spot with your host before travelling.",
    "This is a pickup reminder at the booked departure time. It does not predict arrival.",
    ...(ride.sample
      ? [
          "This is a fictional sample ride for local testing; no real journey is arranged.",
        ]
      : []),
    directionsUrl(ride.origin, ride.destination),
  ].join("\n");
  return (
    [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//ShareCommute//Campus Pickup//EN",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      `UID:${booking.id}@sharecommute.local`,
      `DTSTAMP:${utc(now)}`,
      `DTSTART:${utc(departure)}`,
      "DURATION:PT15M",
      `SUMMARY:${escapeText(`ShareCommute pickup: ${origin.short} to ${destination.short}`)}`,
      `LOCATION:${escapeText(`${origin.name}, Pune`)}`,
      `DESCRIPTION:${escapeText(description)}`,
      `URL:${directionsUrl(ride.origin, ride.destination)}`,
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      "TRIGGER:-PT15M",
      `DESCRIPTION:${escapeText("Upcoming ShareCommute pickup")}`,
      "END:VALARM",
      "STATUS:CONFIRMED",
      "TRANSP:TRANSPARENT",
      "END:VEVENT",
      "END:VCALENDAR",
    ]
      .map(fold)
      .join("\r\n") + "\r\n"
  );
}
