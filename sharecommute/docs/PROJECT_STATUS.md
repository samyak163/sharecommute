# ShareCommute current status

Updated: 16 October 2026, Asia/Kolkata.

## Current direction

Public GitHub repository: https://github.com/samyak163/sharecommute. The user authorised this public source repository. The website still runs locally. Publishing source on GitHub does not deploy the website. The connected GitHub account and Git Credential Manager account both identify `samyak163`.

## Implemented

- Original ShareCommute interface retained from Phase 1, using React, TypeScript and Vite.
- Node API and shared local SQLite database with versioned SQL migrations. Drizzle is not used.
- Institutional email suffix restriction to `@mitwpu.edu.in`, expiring one-time codes and HttpOnly sessions.
- Explicit local development mailbox with a Use this test code button. Real Resend delivery is supported but not configured and verified end to end.
- Route, date, time-window and seat search, ride-type filters and cost/time sorting.
- Server-authorised ride offers, seat reservations and cancellation, with database capacity protection and booking idempotency.
- Fare splitting in integer paise and current cost allocations.
- Weekday recurring offers, unique occurrences and schedule cancellation.
- Confirmed-participant contact sharing, ride reports and administrator moderation.
- Additive sample seeding for today and the next seven days, with morning trips to campus and evening trips from campus. Dated IDs preserve existing reservations and cancellation history.
- PowerPoint overview in `presentations/`.

## Validation evidence

Fresh verification on 16 October 2026 passed all 27 tests, TypeScript and the Vite production build. This included sample-date rollover, existing-booking preservation, overbooking prevention, duplicate requests, ownership, contact privacy, recurrence and moderation. The staged payload and all existing historical blobs were checked for credentials and local data before publication; no findings were reported.

Browser checks in prior sessions covered sign-in, shared ride visibility across accounts, recurring offer creation and the original booking/cancellation flow. The most recent sample-data refresh has automated booking coverage; complete another manual booking walkthrough when continuing UI work.

## Local operation

Use `npm run dev` inside `sharecommute/`. The default frontend is `http://127.0.0.1:5173/` and API is `http://127.0.0.1:3001/`. The local database is `data/sharecommute.sqlite`. `npm run seed:samples` safely adds missing sample dates.

Local environment variables, database files, authentication secrets and temporary build files must remain untracked. The Resend key stays only in the ignored local environment file and must not be published.

## Remaining work

- Use the repository README to clone and run the project. Further source changes can be committed locally and pushed to the GitHub origin.
- Optional: configure a verified Resend sender and verify actual delivery if the user wants real email verification.
- Finish manual review of admin screens and the latest local sample-booking flow.
- Reconcile older architectural notes when changing the implementation. Live maps, payments and a real campus pilot remain optional future scope.

The earlier Sites project was registered but never published. The user superseded website-hosting plans with local execution and GitHub source sharing.

