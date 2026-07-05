# TransportFlow — Progress Log

> Append a new entry at the TOP after every meaningful coding session, in
> ANY tool (Cursor, Claude Code, Antigravity). This is what lets the next
> session — possibly in a different tool — know what already exists
> without re-reading the entire codebase or guessing. Keep entries short:
> what changed, what's left, anything that surprised you.

---

### 2026-07-05 — Amazon Q — Web app + admin login endpoint

Done:
- Backend: `POST /api/auth/admin/login` — email+password, bcrypt compare, JWT matching DATA-MODELS.md payload. Fixed seed script to use bcrypt instead of SHA-256 placeholder (seed must be re-run for admin login to work).
- Backend: `GET /api/public/trips/:token` — public endpoint, no auth, no org context. Registered before `attachOrgContext` middleware. Used by the public tracking page.
- Web app scaffolded at `/web` — Vite + React + TypeScript + Tailwind v4 (CSS-first, `@tailwindcss/vite` plugin). Dev proxy in `vite.config.ts` forwards `/api` and `/socket.io` to `localhost:3000`.
- `src/lib/api.ts` — axios instance, auto-injects `Authorization: Bearer` from localStorage. Shared TypeScript types for all entities.
- `src/lib/socket.ts` — singleton Socket.IO client, lazy-connect.
- `src/lib/auth.ts` — login/logout/isLoggedIn helpers.
- Pages: Login, Vehicles (list/add/edit/deactivate), Drivers (list/add/edit/deactivate, shows tempPassword on create), Routes (list/add/edit/delete with dynamic stops form), Trips (list/create), TripDetail (live map, start/end buttons, copy tracking link), PublicTrackingPage (`/track/:token`, no auth).
- `LiveMap` component — Leaflet + OpenStreetMap, draws route stop markers, moves vehicle marker on `location:broadcast` Socket.IO events, joins/leaves `trip_<tripId>` room.
- `ProtectedRoute` + `Layout` (sidebar nav) components.
- Both backend and web TypeScript compile with zero errors.

Left / next:
- Mobile app (Expo): driver login, today's trip screen, start/end trip with foreground GPS + `location:update` emit, reconnect handling
- Re-run `npm run seed` in `/backend` before first login (seed now uses bcrypt)

Notes / gotchas:
- Tailwind v4 is CSS-first — no `tailwind.config.js`, uses `@import "tailwindcss"` in `index.css` and `@tailwindcss/vite` plugin. The old `npx tailwindcss init` CLI does not exist in v4.
- Public tracking page uses `/api/public/trips/:token` (no auth). The route/vehicle/driver name lookups on that page still go through the org-scoped endpoints — they work in Phase 0 because there's only one org and `PHASE0_ORG_ID` is set. Phase 1: add public endpoints for those too, or embed names in the trip document.
- Leaflet default icon paths break with Vite bundling — fixed in `LiveMap.tsx` by manually overriding `L.Icon.Default` options with explicit imports.

---

### 2026-07-05 — Amazon Q — Socket.IO real-time tracking server

Done:
- Installed `socket.io` (ships its own TS types, no separate `@types` package needed).
- Created `src/core/tracking/tracking.handler.ts` — registers all four events per `docs/DATA-MODELS.md` payloads:
  - `trip:join` / `trip:leave` — socket joins/leaves `trip_<tripId>` room.
  - `location:update` — writes `lastKnownLocation` to the Trip document (simple overwrite, no history for Phase 0), then broadcasts `location:broadcast` to the room via `io.to()`.
  - `trip:status_changed` — re-broadcasts to the room (allows driver app to emit on reconnect).
- Updated `index.ts` — wrapped Express app in `http.createServer`, attached `SocketIOServer` to it. CORS origin is `*` for Phase 0; lock down in Phase 1. Single instance, no Redis adapter (per `docs/DECISIONS.md`).
- TypeScript compiles with `--strict` and zero errors.

Left / next:
- Web app (React + Tailwind): admin login, Vehicles/Drivers/Routes/Trips pages, live map (Leaflet + Socket.IO), public tracking page at `/track/:token`
- Mobile app (Expo): driver login, today's trip screen, start/end trip with foreground GPS + `location:update` emit
- Also: emit `trip:status_changed` from the REST `start`/`end` endpoints so connected clients update automatically without polling

Notes / gotchas:
- `location:update` DB errors are swallowed silently in the handler — a missed ping is acceptable; crashing the socket connection is not.
- `socket.data.driverId` is used to populate the `driverId` field in `location:broadcast`. The driver app should set this on connect (e.g. via auth handshake or a `socket.data` assignment after JWT verification — Phase 1 concern).
- `app.listen` is gone; the server now starts via `httpServer.listen`. The exported `app` is still available for testing.

---

### 2026-07-05 — Amazon Q — Trip CRUD + Route delete guard

Done:
- `trip.service.ts` — `listTrips`, `getTrip`, `createTrip` (validates routeId/vehicleId/driverId all exist in the same org, generates `publicTrackingToken` via `randomUUID()`), `startTrip` (rejects if already `in_progress` or `completed`), `endTrip` (rejects if `scheduled` or already `completed`). Status-transition errors carry a `.status` property so the controller maps them to the right HTTP code.
- `trip.controller.ts` + `trip.router.ts` — thin controller, same pattern as Vehicle/Driver/Route. `handleServiceError` helper reads `error.status` for the HTTP code.
- Registered at `GET/POST /api/trips` and `PATCH /api/trips/:id/start|end` in `index.ts`. No DELETE endpoint (out of scope for Phase 0).
- Route delete guard: `deleteRoute` in `route.service.ts` now checks for any `scheduled` or `in_progress` trip referencing the route before deleting. Returns 409 with a clear message if blocked. Completed trips referencing a deleted route are allowed (history).
- TypeScript compiles with `--strict` and zero errors across all changes.

Left / next:
- Socket.IO server (`trip:join`, `trip:leave`, `location:update`, `location:broadcast`, `trip:status_changed` — exact payloads in `docs/DATA-MODELS.md`)
- Update `Trip.lastKnownLocation` on every `location:update` event
- Web app (React + Tailwind)
- Mobile app (Expo)

Notes / gotchas:
- Trip service throws errors with an attached `.status` property (e.g. `Object.assign(new Error(...), { status: 409 })`). The controller reads this to set the HTTP response code — keeps all business logic out of the controller.
- `startTrip`/`endTrip` do a read-then-write (findOne + findByIdAndUpdate) rather than a single findOneAndUpdate with a status filter, so the error message can be specific about *why* the transition was rejected.

---

### 2026-07-05 — Amazon Q — Route CRUD

Done:
- Route service (`route.service.ts`) — `listRoutes`, `getRoute`, `createRoute`, `updateRoute`, `deleteRoute`, all scoped by `organizationId` via `req.org`. Stops are sorted by `order` on create and update.
- Route controller (`route.controller.ts`) and router (`route.router.ts`) — same thin controller pattern as Vehicle/Driver.
- Registered at `GET/POST /api/routes` and `GET/PATCH/DELETE /api/routes/:id` in `index.ts`.
- DELETE is a hard-delete (Route has no `status` field in the schema, unlike Vehicle/Driver).
- TypeScript compiles with `--strict` and zero errors.

Left / next:
- Trip CRUD (create, list, get, start, end) + `publicTrackingToken` UUID generation
- Socket.IO server (`trip:join`, `trip:leave`, `location:update`, `location:broadcast`, `trip:status_changed`)
- Web app (React + Tailwind)
- Mobile app (Expo)

Notes / gotchas:
- `route.service.ts` existed as an untracked stub from the previous session; committed as-is after verifying it matched the pattern.
- Hard-delete chosen for routes because there is no `status` field in the Route schema — consistent with DATA-MODELS.md.

---

### 2026-07-05 — Antigravity — Driver CRUD + Password Login & req.org Integration

Done:
- Integrated the typed `req.org` middleware stub into the Express application. Refactored the Vehicle controller to retrieve the `organizationId` from `req.org.organizationId` instead of accessing `process.env.PHASE0_ORG_ID` directly.
- Added a decision record to `docs/DECISIONS.md` documenting this choice.
- Created `Driver` model and CRUD REST endpoints (`GET/POST /api/drivers` and `GET/PATCH/DELETE /api/drivers/:id`) scoped via the `req.org` middleware.
- Transitioned Driver Auth from phone+OTP to phone+password (manager-generated):
  - Updated Driver Mongoose model to include `passwordHash: string`.
  - Added auto-generation of 8-character secure random passwords during driver creation (`POST /api/drivers`). Plaintext password is returned *only once* in the creation response (`tempPassword`) and stored hashed using `bcrypt`.
  - Removed all OTP routes, controllers, and services.
  - Implemented single login endpoint (`POST /api/auth/driver/login`) that compares passwords using `bcrypt` and returns JWT token matching the payload structure in `docs/DATA-MODELS.md`.
  - Installed `jsonwebtoken` and `bcrypt` packages with their TS type definitions to handle token generation and hashing.

Left / next:
- Route CRUD (name + ordered stops with lat/lng)
- Trip CRUD (route, vehicle, driver assignment) + token generation
- Socket.IO server setup for real-time tracking loops

Notes / gotchas:
- Kept the OTP store entirely in-memory to prevent adding fields (like otp code) to the `Driver` DB schema, maintaining strict alignment with `docs/DATA-MODELS.md`.
- Express Request types are globally augmented at `backend/src/@types/express/index.d.ts`.

### 2026-07-05 — Antigravity — Backend scaffold + schemas + seed + Vehicle CRUD

Done:
- Commit 1: Node.js + Express + TypeScript project scaffold (`backend/`), folder
  structure matching `docs/ARCHITECTURE.md`. MongoDB connection in
  `src/shared/db.ts` reads `MONGODB_URI` from env. `/health` endpoint.
  `npm run dev` starts the server, `npm run seed` runs the seed.
- Commit 2: All 6 Mongoose schemas in `src/shared/models/` — Organization,
  User, Driver, Vehicle, Route, Trip — field-for-field from `DATA-MODELS.md`,
  no extras. `organizationId` present on every doc from day one.
- Commit 3: Seed script (`src/scripts/seed.ts`) — creates "TransportFlow Demo
  Org" (generic) and `admin@transportflow.local` / `changeme`. Idempotent.
  Uses SHA-256 placeholder hash; swap for bcrypt when auth is built.
- Commit 4: Vehicle CRUD at `GET/POST /api/vehicles` and
  `GET/PATCH/DELETE /api/vehicles/:id`. Thin controller → service pattern.
  DELETE is a soft-delete (status → inactive). `organizationId` comes from
  `PHASE0_ORG_ID` env var (clear Phase 1 migration point: replace with JWT).
  TypeScript compiles with `--strict` and zero errors.

Left / next:
- Driver CRUD (same pattern as Vehicle — waiting for review before proceeding)
- Route CRUD
- Trip CRUD + `publicTrackingToken` generation
- Socket.IO server (`trip:join`, `location:update`, `location:broadcast`, etc.)
- Auth (JWT for Org Admin email+password; OTP for drivers)

Notes / gotchas:
- Mongoose 8 + TypeScript strict: `.lean()` returns `FlattenMaps<T>` which is
  incompatible with Document-extending interfaces. Fix: pass plain-object type
  as `.lean<PlainType>()` generic and keep service return types as plain
  interfaces, not `Document`-extensions. Applied to Vehicle; do same for
  Driver/Route/Trip services.
- `PHASE0_ORG_ID` env var must be set to the seeded org's `_id` before
  calling the Vehicle endpoints. After seeding, grab the `_id` printed to
  stdout and put it in `.env`.

---

## Template for new entries

```
### YYYY-MM-DD — [tool used] — [short title]
Done:
- ...

Left / next:
- ...

Notes / gotchas:
- ...
```

---

### (no entries yet — this is a fresh repo)
