# ShareCommute

A campus ride-sharing website for finding shared journeys, offering empty seats, and splitting the journey cost. Built as a Project Based Learning project for MIT-WPU, Pune.

## Run locally

Requires Node.js 24 or newer and npm.

```sh
cd sharecommute
npm ci
```

Copy `sharecommute/.env.example` to `sharecommute/.env`, then run:

```sh
npm run dev
```

Open the URL printed by Vite, normally **http://127.0.0.1:5173/**. The local API uses port 3001. Both services bind to this computer only.

## Try a booking

1. Enter a name and an address ending in `@mitwpu.edu.in`.
2. Choose **Send verification code**, check the college inbox and enter the six-digit code.
3. Search from **MIT-WPU Main Gate** for tomorrow around **5:00 PM**.
4. Open a sample ride and select **Confirm booking**.
5. View the reservation in **My rides**, reload the page, or cancel it to release the seat.

Sign-in requires a code delivered to the college inbox. Local test-code sign-in has been removed. Configure a verified email sender before trying a booking. Fictional sample rides are labelled. Reservations use the actual local server and SQLite database.

## Features

- Route, date, departure-window and seat search
- Carpool, cab split and bikepool filters
- Ride offers, reservations and cancellation
- Equal cost sharing with exact integer-paise allocation
- Weekday recurring offers with separate bookings for each occurrence
- Contact details visible to confirmed participants
- Reports and administrator moderation
- Daily sample-data refresh for today and the following seven days

The map is a landmark schematic. Payment collection, live navigation and a real campus rollout are outside the current implementation. Resend sends a branded HTML and plain-text verification email after a sending domain is verified and configured. This setup is currently pending.

## Development

```sh
npm test
npm run typecheck
npm run build
npm start
```

Run these commands from `sharecommute/`. After a build, `npm start` serves the compiled website and API at **http://127.0.0.1:3001/**.

`npm run seed:samples` adds missing dated sample rides without changing existing bookings. To test administration, sign in once and run `npm run admin -- grant your-address@mitwpu.edu.in` locally.

## Project structure

- `sharecommute/src/` and `sharecommute/components/` — React interface
- `sharecommute/server/` — Node API, authentication, ride rules and moderation
- `sharecommute/server/migrations/` — versioned SQLite schema
- `sharecommute/lib/` — shared models, search and fare logic
- `sharecommute/tests/` — domain and server integration tests
- `sharecommute/docs/` — project plan, status and execution notes
- `presentations/` — editable project overview PowerPoint

The frontend uses React, TypeScript and Vite. The backend uses Node.js and SQLite with parameterized SQL. The project originated from a starter; some unused starter components remain in the source tree.

## Local data and secrets

`.env`, API keys, SQLite databases, sessions, dependencies, build output and presentation intermediates are excluded from Git. Start from `.env.example` on another computer. Do not commit real credentials or database files.

## Project notes

The two-phase plan preserves the original frontend while adding the shared local backend. See [current status](sharecommute/docs/PROJECT_STATUS.md), [execution guide](sharecommute/docs/EXECUTION.md) and [presentation](presentations/ShareCommute_Project_Overview.pptx).

Quick Ride inspired the find-and-offer workflow. ShareCommute is an independent academic project and is not affiliated with Quick Ride.
