# Support Desk Frontend

The frontend is a React, TypeScript, and Vite application for the support desk. It provides the agent workspace for tickets, conversations, teams, settings, and audit history.

## Prerequisites

- Node.js and npm
- The backend API running locally (see [the backend README](../backend/README.md))
- A Firebase project with a web app configured for authentication
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

Fill in the Firebase web app values in `.env`, then start the development server:

```sh
make dev
```

Vite serves the app at <http://localhost:5173>. The API and socket defaults point to `http://localhost:4000`; change `VITE_API_URL` and `VITE_SOCKET_URL` in `.env` if the backend runs elsewhere.

## Environment variables

| Variable                            | Purpose                                                  |
| ----------------------------------- | -------------------------------------------------------- |
| `VITE_API_URL`                      | Backend API base URL, including `/api`                   |
| `VITE_SOCKET_URL`                   | Backend Socket.IO origin                                 |
| `VITE_FIREBASE_API_KEY`             | Firebase web app API key                                 |
| `VITE_FIREBASE_AUTH_DOMAIN`         | Firebase web app auth domain                             |
| `VITE_FIREBASE_PROJECT_ID`          | Firebase project ID                                      |
| `VITE_FIREBASE_STORAGE_BUCKET`      | Firebase web app storage bucket                          |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase web app sender ID                               |
| `VITE_FIREBASE_APP_ID`              | Firebase web app ID                                      |
| `VITE_FIREBASE_MEASUREMENT_ID`      | Firebase web app measurement ID (optional for analytics) |

Vite exposes `VITE_` variables in the browser bundle. Use only Firebase web configuration here; never put private keys or server credentials in this file.

## What to change

- `src/pages/`: screens and page-specific behavior. Ticket list, detail, and form pages live under `src/pages/ticket/`.
- `src/components/`: shared UI and application shell.
- `src/routes/routeList.tsx`: route registration and page-level permission checks.
- `src/api/`: API clients, query hooks, and feature services. Update these when backend endpoints or request/response types change.
- `src/contexts/` and `src/constants/authorization.ts`: authentication, workspace state, and permission behavior.
- `src/lib/firebase.ts`: Firebase web app initialization.
- `.env`: local API, socket, and Firebase web app configuration; use `.env.example` as the template.

Keep API paths and data types consistent with the backend. Do not commit `.env`.

## Common commands

Run these commands from the `frontend` directory:

| Command           | Description                                           |
| ----------------- | ----------------------------------------------------- |
| `npm ci`          | Install exact dependencies from `package-lock.json`   |
| `npm run dev`     | Start the Vite development server                     |
| `npm run build`   | Type-check and create the production build in `dist/` |
| `npm run preview` | Serve the existing production build locally           |
