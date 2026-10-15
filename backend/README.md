# Support Desk Backend

The backend is a TypeScript, Express, and Socket.IO API. It provides authentication, organization and team workflows, tickets, conversations, invitations, and audit logging, with MongoDB persistence and Firebase ID token verification.

## Prerequisites

- Node.js and npm
- MongoDB running locally or a MongoDB connection URI
- A Firebase project ID and Firebase Admin credentials for verifying user ID tokens
- GNU Make to use the Makefile targets (on Windows, use a GNU Make environment such as Git Bash or WSL)

## Get started

From this directory:

```sh
make install
cp .env.example .env
```

On Windows Command Prompt, copy the environment template with:

```bat
copy .env.example .env
```

Set `MONGODB_URI` and `FIREBASE_PROJECT_ID` in `.env`. Firebase Admin uses Application Default Credentials; configure them for your environment (for local development, use `gcloud auth application-default login` or provide credentials through the standard Google Cloud credential configuration). Then start the API:

```sh
make dev
```

The API listens on port `4000` by default. Check `http://localhost:4000/api/health` for its health response. Set `CLIENT_ORIGIN` to the frontend origin if it differs from `http://localhost:5173`.

The `TEST_AUTH_ENABLED` setting is intended only for tests and must remain `false` outside test use. The server refuses to start in production when it is set to `true`.

## Environment variables

| Variable              | Purpose                                                                        |
| --------------------- | ------------------------------------------------------------------------------ |
| `PORT`                | HTTP server port (default `4000`)                                              |
| `NODE_ENV`            | Runtime environment: `development`, `test`, or `production`                    |
| `MONGODB_URI`         | MongoDB connection string (defaults to local `support_desk` database)          |
| `CLIENT_ORIGIN`       | Allowed frontend origin for CORS                                               |
| `FIREBASE_PROJECT_ID` | Firebase project used to verify ID tokens                                      |
| `TEST_AUTH_ENABLED`   | Enables test authentication where supported; never set to `true` in production |

## What to change

- `src/routes/`: HTTP endpoints for organizations, tickets, conversations, and invitations.
- `src/services/`: reusable business logic, including audit logging.
- `src/models/`: Mongoose document schemas and persistence models.
- `src/middleware/`: authentication, organization context, and error handling.
- `src/sockets/`: Socket.IO setup and real-time event behavior.
- `src/config/env.ts`: validated environment variables and defaults.
- `src/config/firebaseAdmin.ts`: Firebase Admin initialization and token-verification setup.
- `tests/`: backend tests. Add or update tests when changing route, authorization, or service behavior.
- `.env`: local database, API, and Firebase project settings; use `.env.example` as the template.

Keep API response shapes and event payloads consistent with the frontend's `src/api/` services and types. Do not commit `.env` or credential files.

## Common commands

Run these commands from the `backend` directory:

| Command              | Description                                                     |
| -------------------- | --------------------------------------------------------------- |
| `npm ci`             | Install exact dependencies from `package-lock.json`             |
| `npm run dev`        | Start the Server                                                |
| `npm run build`      | Compile TypeScript into `dist/`                                 |
| `npm test`           | Run the test suite once                                         |
| `npm run test:watch` | Run tests in watch mode                                         |
| `npm start`          | Start the compiled API from `dist/` (run `npm run build` first) |
