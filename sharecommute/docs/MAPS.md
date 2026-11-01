# Google Maps setup and behaviour

The original schematic has been replaced with a Google road map. Maps appear in the selected-ride sidebar, ride details and the offer form. Users can pan/zoom, see A/B endpoints, read road distance and estimated driving time, fit the whole route, or open Google Maps directions.

## Local configuration

Set `VITE_GOOGLE_MAPS_API_KEY` in ignored `.env`. The supplied key is already configured on the current computer. Restart `npm run dev` after changing it; rebuild before using compiled mode. `VITE_GOOGLE_MAPS_MAP_ID` is optional for a custom Google map ID; local development defaults to Google's `DEMO_MAP_ID`.

The key's Google Cloud project requires active billing, **Maps JavaScript API** and **Routes API**. The current key successfully served real maps and routes during testing. No Places API, geolocation permission or extra server key is required for the current named-landmark flow.

A browser Maps key is visible to the browser. Keep it out of Git and restrict its Google Cloud application settings to the local website origins that are actually used: `http://127.0.0.1:5173` (development), `http://127.0.0.1:3001` (compiled mode), and corresponding localhost origins if used. Use website restrictions compatible with origin-only referrers, and API restrictions for Maps JavaScript API and Routes API. Google Cloud restrictions cannot be inspected or changed from the API key alone; verify them in the owner's console before distributing the app. The implementation does not require public website hosting.

## Scope and resilience

- Existing landmark IDs and exact-route matching are unchanged. Google's address lookup is explicitly limited to named Pune landmarks.
- Google calculates a suggested **driving** route for every ride type. It is not motorcycle-specific navigation. Broad landmarks such as Baner Road still need the host's exact meeting note.
- Distance and duration are provider values; time excludes live traffic and is not a promise for the scheduled departure.
- There is no vehicle tracking or automatic location collection.
- The SDK loads once per page. A maximum of 64 route entries share in-flight requests and five-minute results in memory. Failed requests are removed so a retry can recover. Reverse routes are separate entries.
- Route changes discard outdated async results and remove old markers and polylines. Loading/error maps are hidden from keyboard and assistive-technology interaction.
- A missing key or provider/network error shows a recoverable map state. Booking, cancellation and other server features remain independent. External directions links are key-free.
- Route responses are not written to SQLite, localStorage or the source repository.

## Evidence from 1 November 2026

All 38 automated tests and the TypeScript/production build passed. Live browser checks covered campus to Warje, Shivajinagar, Pune Station, Deccan, Baner and Swargate, plus Pune Station back to campus. All returned road paths, markers, distance and duration. Ride details and offer previews worked; changing destinations and recovering from an identical pickup/drop-off selection were inspected. A real Google map was visually checked inside a 360 px component container; this was not full-device emulation.

Examples returned during this check: campus–Warje 8.1 km / 21 min, campus–Shivajinagar 7.2 km / 26 min, campus–Pune Station 8.8 km / 31 min, and Pune Station–campus 9.4 km / 30 min. These are test observations, not fixed application values. Screenshots and the temporary layout harness remain under ignored `work/`.

Official references: [Routes setup](https://developers.google.com/maps/documentation/javascript/routes/start), [route requests](https://developers.google.com/maps/documentation/javascript/routes/get-a-route), [API-key restrictions](https://developers.google.com/maps/api-security-best-practices).
