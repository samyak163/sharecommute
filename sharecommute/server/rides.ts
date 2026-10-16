import type { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  PLACES,
  initialState,
  splitFare,
  indiaDate,
  departureAt,
  type Ride,
  type Booking,
  type CommuteState,
  type RecurringSchedule,
} from "../lib/commute.ts";
import { transaction } from "./database.ts";
import { HttpError } from "./errors.ts";
import type { User } from "./auth.ts";

type RideRow = {
  id: string;
  owner_id: string;
  host: string;
  role: Ride["role"];
  origin: Ride["origin"];
  destination: Ride["destination"];
  departure: string;
  departure_ms: number;
  type: Ride["type"];
  vehicle: string;
  capacity: number;
  seeded_passengers: number;
  total_paise: number;
  note: string;
  status: Ride["status"];
  sample: number;
  template_id: string | null;
};
type BookingRow = {
  id: string;
  ride_id: string;
  user_id: string;
  seats: number;
  status: Booking["status"];
  idempotency_key: string;
  created_at: number;
  seq: number;
};
const locationSchema = z
  .string()
  .refine((id) => PLACES.some((p) => p.id === id), "Choose a listed landmark.");
export const offerSchema = z
  .object({
    origin: locationSchema,
    destination: locationSchema,
    departure: z.string().datetime({ offset: true }),
    type: z.enum(["carpool", "cab", "bike"]),
    vehicle: z.string().trim().min(2).max(50),
    capacity: z.number().int().min(2).max(7),
    totalPaise: z.number().int().min(0).max(500000),
    note: z.string().trim().max(180).default(""),
  })
  .refine(
    (r) => r.origin !== r.destination,
    "Choose two different pickup and drop-off points.",
  )
  .refine(
    (r) => r.capacity <= (r.type === "bike" ? 2 : r.type === "carpool" ? 5 : 7),
    "Capacity exceeds the selected vehicle type.",
  );
const bookingSchema = z.object({
  seats: z.number().int().min(1).max(6),
  idempotencyKey: z.string().uuid(),
});

export function createRideService(
  db: DatabaseSync,
  now: () => number = Date.now,
) {
  const rideById = (id: string) =>
    db
      .prepare(
        "SELECT r.*, u.name AS host, u.role FROM rides r JOIN users u ON u.id = r.owner_id WHERE r.id = ?",
      )
      .get(id) as RideRow | undefined;
  const activeBookings = (rideId: string) =>
    db
      .prepare(
        "SELECT * FROM bookings WHERE ride_id = ? AND status = 'confirmed' ORDER BY seq",
      )
      .all(rideId) as BookingRow[];
  function state(user: User): CommuteState {
    return transaction(db, () => {
      const rows = db
        .prepare(
          "SELECT r.*, u.name AS host, u.role FROM rides r JOIN users u ON u.id = r.owner_id WHERE (r.status = 'open' AND r.departure_ms > ?) OR r.owner_id = ? OR r.id IN (SELECT ride_id FROM bookings WHERE user_id = ?) ORDER BY r.created_at DESC, r.id",
        )
        .all(now(), user.id, user.id) as RideRow[];
      const own = db
        .prepare("SELECT * FROM bookings WHERE user_id = ? ORDER BY seq")
        .all(user.id) as BookingRow[];
      const shares = new Map<string, number>();
      const rides: Ride[] = rows.map((r) => {
        const active = activeBookings(r.id);
        const totalPeople =
          1 + r.seeded_passengers + active.reduce((sum, b) => sum + b.seats, 0);
        const fare = splitFare(r.total_paise, totalPeople);
        let index = 1 + r.seeded_passengers;
        for (const b of active) {
          if (b.user_id === user.id)
            shares.set(
              b.id,
              fare.slice(index, index + b.seats).reduce((a, b) => a + b, 0),
            );
          index += b.seats;
        }
        return {
          id: r.id,
          ownerId: r.owner_id,
          host: r.host,
          role: r.role,
          department: r.sample ? "Sample campus member" : "Campus member",
          origin: r.origin,
          destination: r.destination,
          departure: r.departure,
          type: r.type,
          vehicle: r.vehicle,
          capacity: r.capacity,
          otherPassengers:
            r.seeded_passengers +
            active
              .filter((b) => b.user_id !== user.id)
              .reduce((sum, b) => sum + b.seats, 0),
          totalPaise: r.total_paise,
          note: r.note,
          status: r.status,
          sample: !!r.sample,
          templateId: r.template_id ?? undefined,
          ...(r.status === "open" &&
          !r.sample &&
          active.some((b) => b.user_id === user.id)
            ? {
                hostEmail: String(
                  db
                    .prepare("SELECT email FROM users WHERE id = ?")
                    .get(r.owner_id)!.email,
                ),
              }
            : {}),
          ...(r.status === "open" && r.owner_id === user.id
            ? {
                passengers: db
                  .prepare(
                    "SELECT u.name,u.email,b.seats FROM bookings b JOIN users u ON u.id=b.user_id WHERE b.ride_id=? AND b.status='confirmed' ORDER BY b.seq",
                  )
                  .all(r.id) as {
                  name: string;
                  email: string;
                  seats: number;
                }[],
              }
            : {}),
        };
      });
      return {
        version: 1,
        rides,
        bookings: own.map((b) => ({
          id: b.id,
          rideId: b.ride_id,
          userId: b.user_id,
          seats: b.seats,
          status: b.status,
          createdAt: new Date(b.created_at).toISOString(),
          sharePaise: shares.get(b.id),
        })),
        schedules: db
          .prepare(
            "SELECT * FROM recurring_templates WHERE owner_id=? ORDER BY created_at DESC",
          )
          .all(user.id)
          .map((row) => {
            const ride = JSON.parse(String(row.ride_json));
            return {
              id: row.id,
              origin: ride.origin,
              destination: ride.destination,
              weekdays: JSON.parse(String(row.weekdays)),
              localTime: row.local_time,
              startDate: row.start_date,
              endDate: row.end_date,
              active: !!row.active,
            } as RecurringSchedule;
          }),
      };
    });
  }
  return {
    state,
    offer(user: User, input: unknown) {
      const parsed = offerSchema.safeParse(input);
      if (!parsed.success)
        throw new HttpError(400, parsed.error.issues[0].message);
      const r = parsed.data,
        timestamp = new Date(r.departure).getTime();
      if (timestamp <= now())
        throw new HttpError(400, "Choose a departure time in the future.");
      if (timestamp > now() + 90 * 86400000)
        throw new HttpError(400, "Offer a ride within the next 90 days.");
      const id = randomUUID();
      const recurring = z
        .object({
          recurring: z
            .object({
              weekdays: z.array(z.number().int().min(1).max(5)).min(1).max(5),
              endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            })
            .optional(),
        })
        .safeParse(input);
      if (!recurring.success)
        throw new HttpError(400, "Choose valid weekdays and an end date.");
      if (recurring.data.recurring) {
        const { endDate, weekdays } = recurring.data.recurring;
        const startDate = indiaDate(new Date(timestamp));
        const localTime = new Intl.DateTimeFormat("en-GB", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
        }).format(new Date(timestamp));
        if (
          !Number.isFinite(new Date(`${endDate}T12:00:00Z`).getTime()) ||
          new Date(`${endDate}T12:00:00Z`).toISOString().slice(0, 10) !==
            endDate ||
          endDate < startDate ||
          new Date(`${endDate}T12:00:00Z`).getTime() -
            new Date(`${startDate}T12:00:00Z`).getTime() >
            90 * 86400000
        )
          throw new HttpError(
            400,
            "The repeat end date must be within 90 days of the first date.",
          );
        const uniqueDays = [...new Set(weekdays)];
        const hasDeparture = Array.from(
          { length: 91 },
          (_, i) =>
            new Date(
              new Date(`${startDate}T12:00:00Z`).getTime() + i * 86400000,
            ),
        ).some(
          (d) =>
            d.toISOString().slice(0, 10) <= endDate &&
            uniqueDays.includes(d.getUTCDay()),
        );
        if (!hasDeparture)
          throw new HttpError(
            400,
            "No selected weekday occurs within these dates.",
          );
        transaction(db, () => {
          db.prepare(
            "INSERT INTO recurring_templates(id,owner_id,ride_json,weekdays,local_time,start_date,end_date,created_at) VALUES(?,?,?,?,?,?,?,?)",
          ).run(
            id,
            user.id,
            JSON.stringify(r),
            JSON.stringify(uniqueDays),
            localTime,
            startDate,
            endDate,
            now(),
          );
          generateOccurrences(id);
        });
        return { id, state: state(user) };
      }
      db.prepare(
        "INSERT INTO rides(id,owner_id,origin,destination,departure,departure_ms,type,vehicle,capacity,total_paise,note,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
      ).run(
        id,
        user.id,
        r.origin,
        r.destination,
        r.departure,
        timestamp,
        r.type,
        r.vehicle,
        r.capacity,
        r.totalPaise,
        r.note,
        now(),
      );
      return { id, state: state(user) };
    },
    book(user: User, rideId: string, input: unknown) {
      const parsed = bookingSchema.safeParse(input);
      if (!parsed.success)
        throw new HttpError(
          400,
          "Choose a valid seat count and request identifier.",
        );
      const { seats, idempotencyKey } = parsed.data;
      const id = transaction(db, () => {
        const replay = db
          .prepare(
            "SELECT * FROM bookings WHERE user_id = ? AND idempotency_key = ?",
          )
          .get(user.id, idempotencyKey) as BookingRow | undefined;
        if (replay) {
          if (replay.ride_id !== rideId || replay.seats !== seats)
            throw new HttpError(
              409,
              "This request identifier was already used for another booking.",
            );
          return replay.id;
        }
        const ride = rideById(rideId);
        if (!ride || ride.status !== "open" || ride.departure_ms <= now())
          throw new HttpError(409, "This ride is no longer available.");
        if (ride.owner_id === user.id)
          throw new HttpError(400, "You cannot book your own ride.");
        const active = activeBookings(rideId);
        if (active.some((b) => b.user_id === user.id))
          throw new HttpError(409, "You already have a booking for this ride.");
        const available =
          ride.capacity -
          1 -
          ride.seeded_passengers -
          active.reduce((sum, b) => sum + b.seats, 0);
        if (seats > available)
          throw new HttpError(
            409,
            "There are not enough seats left. Refresh the rides and choose another.",
          );
        const bookingId = randomUUID();
        db.prepare(
          "INSERT INTO bookings(id,ride_id,user_id,seats,status,idempotency_key,created_at) VALUES(?,?,?,?,'confirmed',?,?)",
        ).run(bookingId, rideId, user.id, seats, idempotencyKey, now());
        return bookingId;
      });
      return { id, state: state(user) };
    },
    cancelBooking(user: User, bookingId: string) {
      transaction(db, () => {
        const booking = db
          .prepare("SELECT * FROM bookings WHERE id = ? AND user_id = ?")
          .get(bookingId, user.id) as BookingRow | undefined;
        if (!booking) throw new HttpError(404, "Booking not found.");
        db.prepare(
          "UPDATE bookings SET status = 'cancelled' WHERE id = ? AND status = 'confirmed'",
        ).run(bookingId);
      });
      return { state: state(user) };
    },
    cancelOffer(user: User, rideId: string) {
      transaction(db, () => {
        const ride = rideById(rideId);
        if (!ride || ride.owner_id !== user.id)
          throw new HttpError(404, "Your ride offer was not found.");
        db.prepare(
          "UPDATE bookings SET status = 'cancelled' WHERE ride_id = ? AND status = 'confirmed'",
        ).run(rideId);
        db.prepare("UPDATE rides SET status = 'cancelled' WHERE id = ?").run(
          rideId,
        );
      });
      return { state: state(user) };
    },
    stopSchedule(user: User, templateId: string) {
      transaction(db, () => {
        const template = db
          .prepare(
            "SELECT id FROM recurring_templates WHERE id=? AND owner_id=?",
          )
          .get(templateId, user.id);
        if (!template)
          throw new HttpError(404, "Your recurring schedule was not found.");
        db.prepare("UPDATE recurring_templates SET active=0 WHERE id=?").run(
          templateId,
        );
        db.prepare(
          "UPDATE bookings SET status='cancelled' WHERE ride_id IN (SELECT id FROM rides WHERE template_id=? AND departure_ms>?) AND status='confirmed'",
        ).run(templateId, now());
        db.prepare(
          "UPDATE rides SET status='cancelled' WHERE template_id=? AND departure_ms>?",
        ).run(templateId, now());
      });
      return { state: state(user) };
    },
    generateScheduled() {
      transaction(db, () => generateOccurrences());
    },
    seed() {
      const timestamp = now();
      const sampleRides = initialState(new Date(timestamp)).rides;
      return transaction(db, () => {
        let added = 0;
        const insertRide = db.prepare(
          "INSERT INTO rides(id,owner_id,origin,destination,departure,departure_ms,type,vehicle,capacity,seeded_passengers,total_paise,note,sample,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,1,?) ON CONFLICT(id) DO NOTHING",
        );
        for (const r of sampleRides) {
          db.prepare(
            "INSERT OR IGNORE INTO users(id,email,name,role,verification,created_at) VALUES(?,?,?,?,'sample',?)",
          ).run(
            r.ownerId,
            `${r.ownerId}@sample.invalid`,
            r.host,
            r.role,
            timestamp,
          );
        }
        // Date-specific identifiers make this additive and safe to run again.
        // Never move an existing ride to another day or reset reserved seats.
        for (let day = 0; day <= 7; day++) {
          const date = indiaDate(new Date(timestamp + day * 86_400_000));
          for (const [index, r] of sampleRides.entries()) {
            for (const direction of ["from-campus", "to-campus"] as const) {
              const inbound = direction === "to-campus";
              const minutes = 8 * 60 + index * 15;
              const time = inbound
                ? `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`
                : r.departure.slice(11, 16);
              const departure = departureAt(date, time);
              const departureMs = new Date(departure).getTime();
              if (departureMs <= timestamp) continue;
              const pickup = inbound ? r.destination : r.origin;
              const pickupName = PLACES.find((p) => p.id === pickup)!.name;
              const result = insertRide.run(
                `${r.id}-${date}-${direction}`,
                r.ownerId,
                pickup,
                inbound ? r.origin : r.destination,
                departure,
                departureMs,
                r.type,
                r.vehicle,
                r.capacity,
                r.otherPassengers,
                r.totalPaise,
                `Sample ride for local testing. Meet at ${pickupName} 5 minutes before departure.`,
                timestamp,
              );
              added += Number(result.changes);
            }
          }
        }
        return added > 0;
      });
    },
  };
  function generateOccurrences(templateId?: string) {
    const templates = db
      .prepare(
        "SELECT t.* FROM recurring_templates t JOIN users u ON u.id=t.owner_id WHERE t.active=1 AND u.suspended=0 AND (? IS NULL OR t.id=?)",
      )
      .all(templateId ?? null, templateId ?? null);
    // Bounded (maximum 91 days per template), unique per template/date. Keeping
    // cancelled occurrences prevents the scheduler recreating a cancelled ride.
    for (const t of templates) {
      const r = offerSchema.parse(JSON.parse(String(t.ride_json)));
      const weekdays = JSON.parse(String(t.weekdays)) as number[];
      const start = Math.max(
        new Date(`${t.start_date}T12:00:00Z`).getTime(),
        new Date(`${indiaDate(new Date(now()))}T12:00:00Z`).getTime(),
      );
      const end = new Date(`${t.end_date}T12:00:00Z`).getTime();
      for (let day = start; day <= end; day += 86400000) {
        const date = new Date(day),
          dateKey = date.toISOString().slice(0, 10);
        if (!weekdays.includes(date.getUTCDay())) continue;
        const departure = departureAt(dateKey, String(t.local_time)),
          timestamp = new Date(departure).getTime();
        if (timestamp <= now()) continue;
        db.prepare(
          "INSERT INTO rides(id,owner_id,origin,destination,departure,departure_ms,type,vehicle,capacity,total_paise,note,created_at,template_id,occurrence_date) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT DO NOTHING",
        ).run(
          randomUUID(),
          String(t.owner_id),
          r.origin,
          r.destination,
          departure,
          timestamp,
          r.type,
          r.vehicle,
          r.capacity,
          r.totalPaise,
          r.note,
          now(),
          String(t.id),
          dateKey,
        );
      }
    }
  }
}
