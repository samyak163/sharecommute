# ShareCommute application

The application runs locally with React, TypeScript, Vite, Node.js and SQLite.

See the [repository README](../README.md) for installation, sample booking instructions, features and commands. Read [current status](docs/PROJECT_STATUS.md) before continuing development.

From this directory, with Node.js 24 or newer:

```sh
npm ci
npm run dev
npm test
npm run typecheck
npm run build
```

Copy `.env.example` to `.env` before configuring mail settings. The default development mode displays a test code and sends no email. Local accounts, bookings and offers are stored in the ignored `data/` directory.
