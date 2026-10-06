import { z } from "zod";
import { initialState, PLACES, type CommuteState } from "./commute";
const STORAGE_KEY = "sharecommute.demo.v1";
const placeSchema = z.string().refine((id) => PLACES.some((p) => p.id === id));
const rideSchema = z
  .object({
    id: z.string().max(100),
    ownerId: z.string().max(100),
    host: z.string().max(60),
    role: z.enum(["Student", "Faculty"]),
    department: z.string().max(80),
    origin: placeSchema,
    destination: placeSchema,
    departure: z.string().datetime({ offset: true }),
    type: z.enum(["carpool", "cab", "bike"]),
    vehicle: z.string().max(50),
    capacity: z.number().int().min(2).max(7),
    otherPassengers: z.number().int().min(0).max(6),
    totalPaise: z.number().int().min(0).max(500_000),
    note: z.string().max(180),
    status: z.enum(["open", "cancelled"]),
    sample: z.boolean(),
  })
  .refine(
    (r) =>
      r.origin !== r.destination &&
      r.otherPassengers < r.capacity &&
      r.capacity <= (r.type === "bike" ? 2 : r.type === "carpool" ? 5 : 7),
  );
const stateSchema = z
  .object({
    version: z.literal(1),
    rides: z.array(rideSchema).max(500),
    bookings: z
      .array(
        z.object({
          id: z.string().max(100),
          rideId: z.string().max(100),
          userId: z.string().max(100),
          seats: z.number().int().min(1).max(6),
          status: z.enum(["confirmed", "cancelled"]),
          createdAt: z.string().datetime(),
        }),
      )
      .max(1000),
  })
  .superRefine((state, ctx) => {
    const rides = new Map(state.rides.map((r) => [r.id, r]));
    if (
      rides.size !== state.rides.length ||
      new Set(state.bookings.map((b) => b.id)).size !== state.bookings.length
    )
      ctx.addIssue({ code: "custom", message: "Duplicate records" });
    for (const b of state.bookings)
      if (!rides.has(b.rideId))
        ctx.addIssue({ code: "custom", message: "Missing ride" });
    for (const r of state.rides) {
      const active = state.bookings.filter(
        (b) => b.rideId === r.id && b.status === "confirmed",
      );
      if (
        1 + r.otherPassengers + active.reduce((n, b) => n + b.seats, 0) >
          r.capacity ||
        (r.status === "cancelled" && active.length) ||
        new Set(active.map((b) => b.userId)).size !== active.length
      )
        ctx.addIssue({ code: "custom", message: "Invalid seat allocation" });
    }
  });
export function loadDemo(): { state: CommuteState; warning: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { state: initialState(), warning: "" };
    const result = stateSchema.safeParse(JSON.parse(raw));
    if (!result.success)
      return {
        state: initialState(),
        warning:
          "The saved demo was unreadable. A fresh set of sample rides is ready.",
      };
    return { state: result.data as CommuteState, warning: "" };
  } catch {
    return {
      state: initialState(),
      warning:
        "Browser storage is unavailable. You can try the demo, but changes may not survive a reload.",
    };
  }
}
export function saveDemo(state: CommuteState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
export function isDemoStorage(key: string | null) {
  return key === STORAGE_KEY;
}
