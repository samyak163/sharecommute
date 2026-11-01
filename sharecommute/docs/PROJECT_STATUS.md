# ShareCommute current status

Updated: 1 November 2026, Asia/Kolkata.

## Current direction

Public GitHub repository: https://github.com/samyak163/sharecommute. The user authorised this public source repository. The website still runs locally. Publishing source on GitHub does not deploy the website. The connected GitHub account and Git Credential Manager account both identify `samyak163`.

## Implemented

- Original ShareCommute interface retained from Phase 1, using React, TypeScript and Vite.
- Node API and shared local SQLite database with versioned SQL migrations. Drizzle is not used.
- Institutional email suffix restriction to `@mitwpu.edu.in`, expiring one-time codes and HttpOnly sessions.
- Email-only verification with branded HTML/plain-text messages, ten-minute expiry, resend cooldown, attempt limits and no exposed test codes. Legacy local-code sessions and challenges are invalid. The valid Resend key is saved only in the ignored .env file. The sender is ShareCommute <no-reply@useclavis.com>. All four Resend DNS records were saved through the signed-in Dynadot in-app browser and confirmed after reload. Resend reports the domain and all four records verified. A real code was requested from the local website; Resend reported delivered and the user confirmed receipt. The user entered the inbox code successfully: the authenticated ride page now shows Email verified.
- Route, date, time-window and seat search, ride-type filters and cost/time sorting.
- Google Maps JavaScript API and Routes Library replace the schematic. Search results, ride details and the offer form show a road map with pickup/drop-off markers, calculated distance, estimated driving time, a fit-route control and key-free Google Maps directions links. Routing uses the existing seven Pune landmarks and driving estimates without live traffic. The key is configured only in ignored .env. In-flight requests and results are shared in a bounded five-minute memory cache; map failures leave booking available.
- Server-authorised ride offers, seat reservations and cancellation, with database capacity protection and booking idempotency.
- Fare splitting in integer paise and current cost allocations.
- Weekday recurring offers, unique occurrences and schedule cancellation.
- Confirmed-participant contact sharing, ride reports and administrator moderation.
- Additive sample seeding for today and the next seven days, with morning trips to campus and evening trips from campus. Dated IDs preserve existing reservations and cancellation history.
- PowerPoint overview in `presentations/`.

## Validation evidence

Previous verification on 16 October 2026 passed all 27 tests, TypeScript and the Vite production build. The email-only changes on 1 November pass 33 tests and TypeScript; the Vite production build also passes. In-app browser control is now working. The current email-only sign-in form was inspected, including its safe send-failure state while DNS was pending. After Resend verified the domain, the website successfully sent a real code and showed the code-entry form with resend cooldown. Resend reported delivered, the user confirmed receipt, and the user-entered code successfully opened the authenticated ride list with Email verified. The receipt and screenshots remain only in ignored work/. Earlier tests included sample-date rollover, existing-booking preservation, overbooking prevention, duplicate requests, ownership, contact privacy, recurrence and moderation. The current staged files and historical blobs were scanned for credentials and local data before the local commit; no findings were reported.

Browser checks in prior sessions covered sign-in, shared ride visibility across accounts, recurring offer creation and the original booking/cancellation flow. The most recent sample-data refresh has automated booking coverage; complete another manual booking walkthrough when continuing UI work.

The Maps addition passes all 38 tests (including request deduplication, failure retries, expiry, bounded caching and key-free directions URLs), TypeScript and the production build. Browser checks used real Google responses for campus to all six other landmarks, and Pune Station back to campus. Checks covered the selected-ride map, ride-detail map, changed offer destinations, recovery from identical-landmark validation, route controls and a 360 px component layout. The full mobile application was not emulated in this pass; the map component itself was visually inspected at that narrow width. See MAPS.md for setup and scope.

## Local operation

Use `npm run dev` inside `sharecommute/`. The default frontend is `http://127.0.0.1:5173/` and API is `http://127.0.0.1:3001/`. The local database is `data/sharecommute.sqlite`. `npm run seed:samples` safely adds missing sample dates.

Local environment variables, database files, authentication secrets and temporary build files must remain untracked. The Resend key stays only in the ignored local environment file and must not be published.

## Remaining work

- Use the repository README to clone and run the project. Further source changes can be committed locally and pushed to the GitHub origin.
- Email setup and the real inbox-code sign-in test are complete. The local app is running on ports 5173/3001 and the in-app tab is signed in. Future sign-ins use a fresh code from the college inbox. The authorised test recipient and delivery receipt remain only in ignored work/. Do not replace the verified DNS records, edit other domains or restore local verification. Any valid @mitwpu.edu.in address is eligible under the same domain rule; real delivery was tested with the authorised inbox, and automated tests cover other college addresses and rejection of personal Gmail addresses.
- Finish manual review of admin screens and the latest local sample-booking flow.
- Payments, vehicle tracking and a real campus pilot remain optional future scope. Interactive road maps are implemented.

The earlier Sites project was registered but never published. The user superseded website-hosting plans with local execution and GitHub source sharing.
