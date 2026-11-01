# ShareCommute execution guide

Requires Node.js 24 or newer. Run commands from `sharecommute/`.

## Start

```sh
npm ci
npm run dev
```

Copy `.env.example` to `.env` to configure the local environment. Local test-code verification has been removed. Email delivery requires a configured sender before users can sign in. The frontend normally uses port 5173 and the API uses 3001. To choose another frontend port, use `npm run dev -- 5174`.

## Checks and compiled mode

```sh
npm test
npm run typecheck
npm run build
npm start
```

After building, the single Node server serves the compiled interface and API on port 3001. Stop the development server first if its API already uses that port.

## Sample data and administration

```sh
npm run seed:samples
npm run admin -- grant your-address@mitwpu.edu.in
npm run admin -- revoke your-address@mitwpu.edu.in
```

Sample seeding adds date-specific rides for today and the next seven days. It never clears or moves an existing ride or booking. The running server refreshes samples when the India calendar date changes. To stop automatic sample additions, set `SEED_SAMPLE_RIDES=false` in `.env` and restart.

Sign in once before granting administration to the local account. Role assignment happens through this local CLI, not through self-registration. Do not grant it to arbitrary users.

## Source map

- `src/main.tsx` and `index.html`: current application entry and metadata.
- `components/commute-app.tsx`: search, ride views and interaction orchestration.
- `components/sign-in-panel.tsx`: email verification interface.
- `components/offer-form.tsx`: single and recurring offer input.
- `components/route-overview.tsx`: reusable interactive map, markers, estimates and route controls.
- `lib/google-maps.ts` and `lib/map-routes.ts`: one SDK loader, route requests/cache and landmark directions URLs.
- `components/admin-panel.tsx`: reports and member moderation.
- `hooks/use-commute-session.ts` and `lib/api.ts`: session and API state.
- `lib/commute.ts`: shared models, filters and exact fare rules.
- `server/auth.ts`: sign-in challenges and sessions.
- `server/rides.ts`: persistence, booking transactions, recurrence and sample seeding.
- `server/admin.ts`: report and moderation permissions.
- `server/migrations/`: immutable applied schema migrations.
- `tests/`: domain and server regression checks.

## Real email delivery

Set `RESEND_API_KEY` and `EMAIL_FROM` in `.env` after verifying a sending domain in Resend. Use a sender such as ShareCommute <no-reply@your-domain.com>. Restart the server. There is no development verification mode. Without a configured sender, the sign-in page reports verification unavailable and cannot display a test code. Legacy local sessions and local challenges cannot sign in. Existing account profiles and ride history remain until email ownership is verified.

## Maps

Maps setup is documented in [MAPS.md](MAPS.md). Configure `VITE_GOOGLE_MAPS_API_KEY` before starting Vite or building. Enable Maps JavaScript API and Routes API on the key's Google project. Browser keys require appropriate website and API restrictions; changing Vite environment values requires a restart or rebuild. The API key is deliberately absent from the source repository.

## Continuity and publication

Read `START_HERE.md` and `docs/PROJECT_STATUS.md` before continuing. Update status and decisions after meaningful changes. The user authorised a public GitHub repository, while website execution remains local. Do not deploy the application to Sites or another host unless requested.

Keep `.env`, databases, local secrets and temporary files outside Git. Review both current files and commit history before a first public push. Preserve the working frontend and shared rules as the backend evolves.
