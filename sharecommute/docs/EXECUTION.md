# ShareCommute execution guide

Requires Node.js 24 or newer. Run commands from `sharecommute/`.

## Start

```sh
npm ci
npm run dev
```

Copy `.env.example` to `.env` to configure the local environment. The default mail mode is development, so no email leaves the computer. The frontend normally uses port 5173 and the API uses 3001. To choose another frontend port, use `npm run dev -- 5174`.

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
- `components/sign-in-panel.tsx`: sign-in and local test-code interface.
- `components/offer-form.tsx`: single and recurring offer input.
- `components/admin-panel.tsx`: reports and member moderation.
- `hooks/use-commute-session.ts` and `lib/api.ts`: session and API state.
- `lib/commute.ts`: shared models, filters and exact fare rules.
- `server/auth.ts`: sign-in challenges and sessions.
- `server/rides.ts`: persistence, booking transactions, recurrence and sample seeding.
- `server/admin.ts`: report and moderation permissions.
- `server/migrations/`: immutable applied schema migrations.
- `tests/`: domain and server regression checks.

## Real email delivery

Set `MAIL_MODE=resend`, `RESEND_API_KEY` and `EMAIL_FROM` in `.env` only after configuring a verified sender in Resend. Restart the server. Development accounts are labelled and do not prove email ownership. Never weaken email verification to make a failed integration appear successful.

## Continuity and publication

Read `START_HERE.md` and `docs/PROJECT_STATUS.md` before continuing. Update status and decisions after meaningful changes. The user authorised a public GitHub repository, while website execution remains local. Do not deploy the application to Sites or another host unless requested.

Keep `.env`, databases, local secrets and temporary files outside Git. Review both current files and commit history before a first public push. Preserve the working frontend and shared rules as the backend evolves.
