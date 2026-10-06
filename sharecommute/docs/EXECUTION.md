# ShareCommute execution guide

## Start or continue

Read the root START_HERE.md and PROJECT_STATUS.md before making changes. Inspect the actual source and Git state; documents do not override code evidence. Preserve working code and use the next unfinished task from PLAN.md.

## Local commands

From `C:\Users\Lenovo\Desktop\pbl\sharecommute`, with Node 22.13 or newer:

```powershell
npm install
npm run dev
npm run typecheck
npm test
npm run build
```

The development URL is printed by the server; the current starter defaults to port 5173. Keep the server alive while reviewing. Do not scan for arbitrary ports. If npm's Windows launcher is broken, invoke its installed CLI directly with Node; this was necessary during initial setup and the Sites build helper:

```powershell
& 'C:\Program Files\nodejs\node.exe' 'C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js' run dev
```

## Source map

| File                          | Responsibility                                   |
| ----------------------------- | ------------------------------------------------ |
| app/page.tsx                  | Page entry                                       |
| app/layout.tsx                | Title, metadata, favicon                         |
| app/globals.css               | Shared visual system and responsive layout       |
| components/commute-app.tsx    | Search, navigation and interaction orchestration |
| components/offer-form.tsx     | Validated offer input                            |
| components/place-select.tsx   | Consistent landmark controls                     |
| components/commute-modal.tsx  | Accessible native dialog and error presentation  |
| components/route-overview.tsx | Labelled landmark diagram                        |
| lib/commute.ts                | Data models, search, fare and reservation rules  |
| lib/demo-repository.ts        | Validated browser storage and failure recovery   |
| tests/commute.test.mjs        | Business rule regression checks                  |
| .openai/hosting.json          | Sites identity and logical runtime capabilities  |

## Phase 2 implementation order

1. Confirm email domains, backend constraints and provider accounts with the user.
2. Add schema migrations for users, rides, bookings and recurring templates. Include foreign keys, capacity checks and uniqueness constraints.
3. Implement sessions and verified identity. Protect every API server-side, including ownership checks.
4. Implement shared ride reads and writes behind an explicit repository/API boundary. Never trust the frontend seat count or quoted fare.
5. Reserve/cancel atomically and add idempotency. Test two simultaneous claims for the final seat against the real database.
6. Switch the existing UI to server data with loading/error/retry handling. Keep a separate resettable demonstration dataset.
7. Add idempotent recurring ride generation, then the smallest useful admin view.
8. Run the Phase 2 completion gate and update status, decisions and mentor demonstration notes.

## Operating rules

Use the existing Site project ID. Never create a replacement Site for an edit. Publish through the Sites workflow and preserve audience. Do not put credentials in shell arguments, source, handoff notes or screenshots. Configure secrets only through the provider's supported secret environment.

After each meaningful session, update PROJECT_STATUS.md with completed tasks, actual command results, known limitations, deployment state and the exact next action. Do not mark a check passed merely because a command was started.

