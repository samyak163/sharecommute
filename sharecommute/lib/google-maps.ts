import { createRouteCache, MAP_LOCATIONS } from "./map-routes.ts";
import type { PlaceId } from "./commute.ts";

declare global {
  interface Window {
    shareCommuteMapsReady?: () => void;
    gm_authFailure?: () => void;
  }
}

export const MAPS_AUTH_FAILURE = "sharecommute:maps-auth-failure";
let loading: Promise<void> | undefined;
let authenticationFailed = false;

/** One SDK load per page; the browser key comes only from the local Vite environment. */
export function loadGoogleMaps(): Promise<void> {
  if (authenticationFailed)
    return Promise.reject(new Error("Map access is unavailable."));
  if (typeof window.google?.maps?.importLibrary === "function")
    return Promise.resolve();
  if (loading) return loading;
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim();
  if (!key) return Promise.reject(new Error("The map is not configured yet."));
  loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    const cleanup = () => {
      clearTimeout(timeout);
      delete window.shareCommuteMapsReady;
    };
    const fail = () => {
      cleanup();
      script.remove();
      reject(
        new Error(
          "The map could not load. Check your connection and try again.",
        ),
      );
    };
    const timeout = setTimeout(fail, 20_000);
    window.gm_authFailure = () => {
      authenticationFailed = true;
      window.dispatchEvent(new Event(MAPS_AUTH_FAILURE));
      fail();
    };
    window.shareCommuteMapsReady = () => {
      cleanup();
      resolve();
    };
    const query = new URLSearchParams({
      key,
      v: "weekly",
      loading: "async",
      callback: "shareCommuteMapsReady",
      language: "en",
      region: "IN",
      auth_referrer_policy: "origin",
    });
    script.src = `https://maps.googleapis.com/maps/api/js?${query}`;
    script.async = true;
    script.onerror = fail;
    document.head.append(script);
  }).catch((error: unknown) => {
    loading = undefined;
    throw error;
  });
  return loading;
}

const routeCache = createRouteCache<google.maps.routes.Route>();

export function getRoadRoute(origin: PlaceId, destination: PlaceId) {
  if (origin === destination)
    return Promise.reject(
      new Error("Choose different pickup and drop-off points."),
    );
  return routeCache.get(`${origin}:${destination}:driving`, async () => {
    await loadGoogleMaps();
    const { Route } = (await google.maps.importLibrary(
      "routes",
    )) as google.maps.RoutesLibrary;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([
        Route.computeRoutes({
          origin: MAP_LOCATIONS[origin],
          destination: MAP_LOCATIONS[destination],
          travelMode: "DRIVING",
          routingPreference: "TRAFFIC_UNAWARE",
          fields: [
            "path",
            "viewport",
            "distanceMeters",
            "durationMillis",
            "warnings",
          ],
          region: "IN",
          language: "en",
        }),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error("Route lookup timed out.")),
            20_000,
          );
        }),
      ]);
      const route = result.routes?.[0];
      if (!route?.path?.length) throw new Error("No driving route was found.");
      return route;
    } finally {
      clearTimeout(timer);
    }
  });
}
