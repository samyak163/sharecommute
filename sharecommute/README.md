# ShareCommute

A campus ride-sharing website delivered in two phases. Phase 1 is the functional frontend foundation; Phase 2 adds verified accounts and a shared backend.

Start with docs/PROJECT_STATUS.md, docs/PLAN.md and docs/EXECUTION.md. The parent workspace START_HERE.md provides the complete handoff.

## Run

Node 22.13 or newer:

```sh
npm install
npm run dev
npm run typecheck
npm test
npm run build
```

## What works now

Route/date/time/seat search, ride filters, sorting, ride details, offers, reservations, cancellation, exact fare sharing and validated device-local persistence. All members and rides in the demo are fictional. The map is a labelled landmark schematic.

## Structure

- components: interface
- lib/commute.ts: pure rules and models
- lib/demo-repository.ts: local storage adapter
- tests: meaningful domain regression checks
- docs: approved scope, decisions, current status, execution and mentor demonstration

No real booking, verification or payment is claimed. Read the status file for the actual validation and deployment results.
