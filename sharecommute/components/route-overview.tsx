"use client";
import { useEffect, useRef, useState } from "react";
import {
  Clock3,
  ExternalLink,
  MapPin,
  Navigation,
  RotateCcw,
} from "lucide-react";
import { place, type PlaceId, type Ride } from "@/lib/commute";
import { directionsUrl } from "@/lib/map-routes";
import {
  getRoadRoute,
  loadGoogleMaps,
  MAPS_AUTH_FAILURE,
} from "@/lib/google-maps";

type RouteInfo = { distance?: number; duration?: number; warnings: string[] };

export default function RouteOverview({
  ride,
  origin,
  destination,
  compact = false,
  explorer = false,
}: {
  ride?: Ride;
  origin?: PlaceId;
  destination?: PlaceId;
  compact?: boolean;
  explorer?: boolean;
}) {
  const from = place(ride?.origin ?? origin ?? "campus");
  const destinationId = ride?.destination ?? destination;
  const to = destinationId ? place(destinationId) : undefined;
  const samePlace = to?.id === from.id;
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const bounds = useRef<google.maps.LatLngBounds | null>(null);
  const [info, setInfo] = useState<RouteInfo | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (
          element.clientWidth > 0 &&
          element.clientHeight > 0 &&
          bounds.current
        ) {
          map.current?.fitBounds(bounds.current, 32);
        }
      });
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let polylines: google.maps.Polyline[] = [];
    let markers: google.maps.marker.AdvancedMarkerElement[] = [];
    setStatus("loading");
    setInfo(null);
    bounds.current = null;
    const fail = (text: string) => {
      if (cancelled) return;
      polylines.forEach((line) => line.setMap(null));
      markers.forEach((marker) => {
        marker.map = null;
      });
      setInfo(null);
      setMessage(text);
      setStatus("error");
    };
    const authFailure = () =>
      fail(
        "The map is unavailable right now. You can still open directions below.",
      );
    window.addEventListener(MAPS_AUTH_FAILURE, authFailure);
    async function showRoute() {
      try {
        if (from.id === to?.id) {
          fail(
            "Choose different pickup and drop-off points to preview the route.",
          );
          return;
        }
        await loadGoogleMaps();
        const { Map } = (await google.maps.importLibrary(
          "maps",
        )) as google.maps.MapsLibrary;
        if (cancelled || !container.current) return;
        map.current ??= new Map(container.current, {
          center: { lat: 18.5204, lng: 73.8567 },
          zoom: 12,
          mapId: import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID",
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          gestureHandling: "cooperative",
          clickableIcons: false,
          colorScheme: google.maps.ColorScheme.LIGHT,
        });
        if (!to) {
          map.current.setCenter({ lat: 18.5204, lng: 73.8567 });
          map.current.setZoom(12);
          setStatus("ready");
          return;
        }
        const route = await getRoadRoute(from.id, to.id);
        if (cancelled) return;
        polylines = route.createPolylines({
          polylineOptions: {
            strokeColor: "#076b4d",
            strokeOpacity: 0.95,
            strokeWeight: 5,
            clickable: false,
          },
        });
        markers = await route.createWaypointAdvancedMarkers();
        if (cancelled) return;
        polylines.forEach((line) => line.setMap(map.current));
        markers.forEach((marker, index) => {
          marker.title =
            index === 0 ? `Pickup: ${from.name}` : `Drop-off: ${to.name}`;
          marker.map = map.current;
        });
        const routeBounds = new google.maps.LatLngBounds();
        route.path!.forEach((point) => routeBounds.extend(point));
        bounds.current = routeBounds;
        map.current.fitBounds(routeBounds, 32);
        setInfo({
          distance: route.distanceMeters,
          duration: route.durationMillis ?? undefined,
          warnings: route.warnings ?? [],
        });
        setStatus("ready");
      } catch {
        fail(
          "The road route could not be loaded. Try again or open Google Maps directions.",
        );
      }
    }
    void showRoute();
    return () => {
      cancelled = true;
      window.removeEventListener(MAPS_AUTH_FAILURE, authFailure);
      polylines.forEach((line) => line.setMap(null));
      markers.forEach((marker) => {
        marker.map = null;
      });
    };
  }, [from.id, to?.id, attempt]);

  return (
    <section
      className={`google-route ${compact ? "compact" : ""} ${explorer ? "explorer-route" : ""}`}
      aria-label="Route map and directions"
    >
      <div className="route-map">
        <div
          ref={container}
          className="google-map-canvas"
          aria-hidden={status !== "ready"}
          inert={status !== "ready"}
          aria-label={
            to
              ? `Driving map from ${from.name} to ${to.name}`
              : "Pune campus area map"
          }
        />
        {status !== "ready" && (
          <div
            className={`map-state ${status === "error" ? "map-error" : ""}`}
            role="status"
          >
            <MapPin size={24} />
            <strong>
              {samePlace
                ? "Choose a different destination"
                : status === "loading"
                  ? "Finding your way…"
                  : "Map unavailable"}
            </strong>
            <p>
              {status === "loading"
                ? "Loading the map and road route."
                : message}
            </p>
            {status === "error" && !samePlace && (
              <button
                type="button"
                className="text-button"
                onClick={() => setAttempt((value) => value + 1)}
              >
                Try again
              </button>
            )}
          </div>
        )}
      </div>
      <div className="map-information">
        {info && (
          <div
            className="map-metrics"
            aria-label="Google Maps driving estimate"
          >
            {Number.isFinite(info.distance) && (
              <span>
                <Navigation size={15} />
                <strong>
                  {(info.distance! / 1000).toLocaleString("en-IN", {
                    maximumFractionDigits: 1,
                  })}{" "}
                  km
                </strong>
              </span>
            )}
            {Number.isFinite(info.duration) && (
              <span>
                <Clock3 size={15} />
                <strong>
                  {Math.max(1, Math.round(info.duration! / 60_000))} min
                </strong>
              </span>
            )}
            <small>Estimated drive</small>
          </div>
        )}
        {to && !samePlace ? (
          <>
            <div className="map-landmarks">
              <p>
                <span>A</span>
                {from.name}
              </p>
              <p>
                <span>B</span>
                {to.name}
              </p>
            </div>
            <div className="map-actions">
              <a
                href={directionsUrl(from.id, to.id)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open directions <ExternalLink size={14} />
              </a>
              {status === "ready" && bounds.current && (
                <button
                  type="button"
                  aria-label="Fit the whole route on the map"
                  onClick={() => {
                    if (bounds.current)
                      map.current?.fitBounds(bounds.current, 32);
                  }}
                >
                  <RotateCcw size={14} /> Fit route
                </button>
              )}
            </div>
            <p className="map-disclaimer">
              Suggested driving route. Time excludes live traffic. Confirm the
              exact meeting spot with your host.
            </p>
            {info?.warnings.map((warning, index) => (
              <p key={index} className="map-warning">
                {warning}
              </p>
            ))}
          </>
        ) : (
          <p className="map-disclaimer">
            {samePlace
              ? "Pickup and drop-off must be different landmarks."
              : "Choose a ride or a destination to preview its road route."}
          </p>
        )}
      </div>
    </section>
  );
}
