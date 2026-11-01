# ShareCommute two phase delivery plan

Approved by the user on 6 October 2026.

## Product

Students and faculty can offer a campus journey, find a compatible ride, reserve available seats, and see an equal share of the journey cost. Start with a small set of named Pune landmarks. Prefer exact landmark matching and a configurable time window over an unexplained AI claim.

## Phase 1 Functional frontend foundation

Build and retain the real application's interface and business rules. Demonstrate with fictional rides and device-local storage, visibly labelled. Deliver route/date/time/seat search; carpool, cab split and bikepool filters; sorting; ride details; booking and cancellation; offer creation and cancellation; My rides; cost sharing; responsive layout; input validation; accessibility basics; and useful empty/error/success states.

The diagram is a landmark schematic, not live navigation. No real ride, identity verification, payment or shared seat transaction is claimed.

Completion gate: meaningful domain tests pass; TypeScript passes; the application builds; main interactions are tested in the browser; desktop and mobile are inspected; source and documentation are saved; the first version is reviewable. Record actual results in PROJECT_STATUS.md.

## Phase 2 Shared backend and verified users

Retain the frontend and pure rules. Add a server repository and durable relational database. Introduce institutional email verification, sessions, ownership checks and server validation. Search reads shared rides. Booking and cancellation update the database atomically. Hide contact details from unauthorised users. Support weekday recurring offers with an idempotent scheduler and cancellation handling. Add a small admin view for ride counts, reports and moderation.

Suggested hosted database: Cloudflare D1/SQLite to match the current hosting stack and avoid another service. Use atomic guarded updates and transactions appropriate to SQLite; do not claim PostgreSQL row locking. If the mentor mandates PostgreSQL or another stack, record the change and use that requirement.

Confirm before this phase: actual accepted student/faculty email domains, mentor's technology constraints, an email delivery provider, expected access for the mentor, and the minimum recurring/admin requirements. The user offered to help with accounts and API setup.

Completion gate: two real test accounts see the same data; unverified users are rejected; users cannot alter another user's records; concurrent attempts cannot overbook the final seat; duplicate submissions are idempotent; cancellations restore capacity; session expiry and rate limits are checked; recurring jobs do not duplicate rides; no secrets are shipped; deployment and recovery are documented.

## Features to defer

Vehicle tracking, cash collection, UPI payment verification, wallets, automatic penalties, AI matching and carbon analytics are outside the current essential scope. UPI QR generation alone does not verify a payment. Emission/savings figures require stated assumptions and evidence. Add a deferred feature only after the core workflows work and the user agrees.

## Academic evidence

Present a clear problem, scoped requirements, UI flow, data model, matching rule, exact fare example, tests and honest limitations. A reproducible demonstration is stronger than a long list of promises.

## Implementation update on 16 October 2026

The implemented shared backend uses a local Node server and SQLite with parameterized SQL and versioned migrations. The user chose local website execution and a public GitHub source repository at https://github.com/samyak163/sharecommute. Earlier hosted Cloudflare/D1 suggestions are superseded. The current source includes recurring schedules, moderation and participant contact sharing.

## Email verification requirement on 1 November 2026

The user now requires real college-inbox verification through Resend. Local-code verification and legacy local sessions have been removed. The sender uses useclavis.com; website hosting is not required for email delivery. Complete provider verification and an actual inbox sign-in test before calling real email authentication finished. See PROJECT_STATUS.md for current evidence.

## Google Maps addition on 1 November 2026

The user supplied a Maps key and approved a working map. Replace the old schematic with an interactive Google map and a calculated driving route for the existing named landmarks. Show pickup/drop-off markers, distance, estimated driving time, route fitting and directions links. Include the same preview in ride details and the offer form. Preserve ride matching, booking rules and the shared database. Keep Maps configuration outside Git, handle provider failures, and verify actual routes in the browser. This scope does not introduce vehicle tracking or custom-address matching.
