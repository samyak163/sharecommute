import type { PlaceId } from "./commute.ts";

/** Explicit Pune landmarks keep Google's address lookup in the campus service area. */
export const MAP_LOCATIONS: Record<PlaceId, string> = {
  campus:
    "MIT World Peace University, Paud Road, Kothrud, Pune, Maharashtra, India",
  deccan: "Deccan Gymkhana, Pune, Maharashtra, India",
  shivajinagar: "Shivajinagar Railway Station, Pune, Maharashtra, India",
  warje: "Warje Bridge, Warje, Pune, Maharashtra, India",
  baner: "Baner Road, Baner, Pune, Maharashtra, India",
  swargate: "Swargate Bus Stand, Pune, Maharashtra, India",
  station: "Pune Railway Station, Pune, Maharashtra, India",
};

export function directionsUrl(origin: PlaceId, destination: PlaceId) {
  const query = new URLSearchParams({
    api: "1",
    origin: MAP_LOCATIONS[origin],
    destination: MAP_LOCATIONS[destination],
    travelmode: "driving",
  });
  return `https://www.google.com/maps/dir/?${query}`;
}

/** Share in-flight requests and short-lived results across previews and details. */
export function createRouteCache<T>(
  ttlMs = 5 * 60_000,
  now: () => number = Date.now,
  maxEntries = 64,
) {
  const entries = new Map<string, { expiresAt: number; promise: Promise<T> }>();
  return {
    get(key: string, request: () => Promise<T>): Promise<T> {
      const entry = entries.get(key);
      if (entry && entry.expiresAt > now()) return entry.promise;
      entries.delete(key);
      if (entries.size >= maxEntries)
        entries.delete(entries.keys().next().value!);
      const promise = Promise.resolve().then(request);
      entries.set(key, { expiresAt: now() + ttlMs, promise });
      void promise.catch(() => {
        if (entries.get(key)?.promise === promise) entries.delete(key);
      });
      return promise;
    },
  };
}
