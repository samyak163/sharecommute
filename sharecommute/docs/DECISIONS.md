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
