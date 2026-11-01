# ShareCommute design decisions

## 6 October 2026

**Scope:** Retain the campus ride-sharing idea from the synopsis. Treat its stack, elaborate security terminology and promised metrics as suggestions. The user explicitly approved two delivery phases.

**Reference:** Quick Ride's actual public site was opened using computer-use browser tools. Its homepage has a taxi booking surface and a carpool section. The carpool section explains find/offer, compare matches, coordinate and share costs. ShareCommute exposes the working ride interface directly in the browser and uses its own branding.

**Frontend:** React and TypeScript using the Sites Vinext starter. Keep its supported build and hosting configuration. Custom CSS supplies an intentional forest-green, white and lime interface. Lucide supplies icons. No paid API is required for Phase 1.

**Architecture:** `lib/commute.ts` contains pure rules and models. `lib/demo-repository.ts` owns validated device-local persistence. React components render and orchestrate interactions. This separation allows the frontend to remain while the repository moves to authenticated server operations in Phase 2. Phase 1 storage is not a production shared booking system.

**Matching:** Exact named origin and destination, travel date in Asia/Kolkata, an inclusive departure tolerance, open status and sufficient seats. No live distance or route overlap percentage is fabricated.

**Seat model:** Capacity includes the host. Availability equals capacity minus host minus passengers. Reservations are positive integer seat counts. Duplicate active bookings and self-bookings are rejected. Cancellation releases seats. Phase 1 operates in one local browser context; multi-user atomicity belongs to the server phase.

**Fare model:** Store integer paise. Split the total across host and passengers, assigning any extra paise deterministically to the earliest participants. Shares sum to the exact total. Quotes describe occupancy after the requested seats join. Existing reservations display the current occupancy share. No money moves.

**Trust:** Fictional members are explicitly marked as sample members. Do not display invented verification, ratings or safety guarantees. Give practical meeting guidance. Real email verification and authorisation are Phase 2 work.

**Continuity:** Keep START_HERE.md, PROJECT_STATUS.md, PLAN.md, EXECUTION.md, DEMO_SCRIPT.md and this decision log current. Root AGENTS.md points a future chat to them.

## Email-only sign-in on 1 November 2026

The user requested real email verification for every valid @mitwpu.edu.in address and removal of local-code sign-in. The UI no longer displays or auto-enters a verification code. Backend responses never return one, and unverified legacy sessions/challenges cannot grant access. Existing profiles and ride history remain available after inbox verification.

The supplied Resend key passed the read-only account check. Its account initially listed zero sending domains, and the user initially had no selected domain. The key remains only in the ignored .env file. A website deployment is not necessary for email delivery. Do not claim that real mail is working until an authorised inbox receives a code and verification succeeds.

## Sender domain selected on 1 November 2026

The user selected useclavis.com at Dynadot for Resend and explicitly authorised DNS setup for this domain only. The domain is registered in Resend and the local sender is ShareCommute <no-reply@useclavis.com>. Exact DNS records are in ignored work/useclavis-resend-dns.txt.

In-app browser control recovered after the user changed settings and asked for another attempt. The four records were saved and confirmed after a page reload. Switching from Dynadot Parking to Dynadot DNS also required a root record; the root A address was preserved as the existing publicly resolved 185.53.179.149. No other domain was edited. Resend subsequently verified the domain and all records. A real code request through the local UI was accepted; Resend reported delivered and the user confirmed receipt. The user entered the inbox code and successfully signed in, with Email verified shown on the authenticated ride page. The website continues to run locally.

## Google Maps routes on 1 November 2026

The user approved maps and supplied a Google key. The key lives in ignored .env as VITE_GOOGLE_MAPS_API_KEY; it is browser-visible by design and must use Google website/API restrictions before broader distribution. No key is embedded in source or documentation. The implementation uses Google's current Maps JavaScript Routes Library instead of the legacy Directions service, with typed SDK calls and no additional runtime package.

Named Pune landmarks remain the matching contract. Google resolves explicit Pune-qualified addresses, calculates a driving route and supplies the displayed distance and duration. Estimates use TRAFFIC_UNAWARE; no GPS or scheduled-departure traffic prediction is claimed. Return and outbound routes use different cache entries. One SDK loader and a bounded, five-minute in-memory request cache avoid duplicate work across the sidebar, details and offer preview. Failures can be retried and the independent Google Maps directions URL remains available. Provider content is not stored in the database.

## Desktop search/map polish on 1 November 2026

The user selected UX proposal item 1 and required implementation, behavioural tests and visual refinement before proceeding to another item. The find page now uses a compact search panel and two-column workspace, with the map given roughly half the available width. Search state remains in CommuteApp; RideExplorer, RideSearchPanel and RideResultCard separate the view into manageable components. A preview action selects the map route without opening the booking dialog. Existing ride details and the existing API/database flow remain in use.

Scoped explorer.css preserves the other screens. The route map observes container-size changes and refits its existing route after layout changes without another route request. The main browser pane is kept visible. After the user explicitly declined phone checks, final acceptance focused on the actual desktop viewport. All other proposed feature additions remain outside this commit.
