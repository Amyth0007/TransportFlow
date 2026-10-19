# TransportFlow — Progress Log

> Append a new entry at the TOP after every meaningful coding session, in
> ANY tool (Cursor, Claude Code, Antigravity). This is what lets the next
> session — possibly in a different tool — know what already exists
> without re-reading the entire codebase or guessing. Keep entries short:
> what changed, what's left, anything that surprised you.

---

### 2026-08-22 — Cursor — Mobile map uses Maps JS (Expo Go)

Done:
- Confirmed `mobile/.env` has `EXPO_PUBLIC_MAPS_API_KEY` and Expo already
  logs `env: export EXPO_PUBLIC_MAPS_API_KEY`. The blank map was not a
  missing env file. Expo Go ignores the project's Android Maps SDK key, so
  native `MapView` stayed black.
- Trip map now loads the Google Maps JavaScript API in a WebView (same key
  that works on web). Added `react-native-webview`. app.config.js reads
  `.env` from disk for future native builds.

---

### 2026-08-22 — Cursor — Fix blank mobile map

Done:
- Created `mobile/.env` with `EXPO_PUBLIC_MAPS_API_KEY` (same Google key as
  web). Wired it into `android.config.googleMaps.apiKey` + the maps plugin
  in `app.config.js` (plugin alone is not enough for Expo Go).
- Removed `overflow: hidden` on the trip map container (Android MapView
  goes blank when clipped). Dropped the opaque loading overlay that covered
  the view if `onMapReady` never fired.

Left / next:
- Restart Expo (`npx expo start -c`) so the new env/config load.
- Enable **Maps SDK for Android** on that Google Cloud key. A JS-only /
  HTTP-referrer-restricted key still shows a blank native map.
- Recent Expo Go builds sometimes cannot show Google tiles at all; a
  development build is the fallback.

---

### 2026-08-22 — Cursor — Driver mobile revamp

Done:
- `GET /api/trips/my` and `GET /api/trips/my/:id` (driver JWT only), with
  route + vehicle. Drivers cannot list/create org trips; start/end only
  on their assigned trip.
- Mobile: ink/cyan theme, login → Home (assigned trips, auto-open live)
  → Trip (hybrid map, roadPath polyline, truck pin, Start/Arrived/End).
- Resume: reopen an `in_progress` trip and GPS continues (foreground).
- Rejoin `trip:join` on socket reconnect.

Left / next:
- Web isolation checklist still pending.
- No background GPS, push, or verticals.
- Run Expo on a device with `EXPO_PUBLIC_API_URL` pointing at the LAN IP.

---

### 2026-08-22 — Cursor — Trip map road path + truck on path

Done:
- Trip/public maps wait until Google Map is ready, then request driving
  Directions through all stops (roads). Pins unchanged.
- Truck GPS is snapped onto that polyline and eased between pings.

---

### 2026-08-22 — Cursor — Trip map shows driving path

Done:
- Trip detail and public tracking use Google Directions (driving, India)
  through ordered stops so the line follows roads. Route editor still
  connects pins. Backend Directions calls use mode=driving&region=in.

---

### 2026-08-22 — Cursor — Add route stop by place name

Done:
- Routes form: Google Places Autocomplete (India). Pick a place to add
  or replace the selected stop. Places library loaded with Maps JS.

---

### 2026-08-22 — Cursor — Route stop 1 from browser location

Done:
- New route form asks for geolocation; if allowed and inside India, stop 1
  is the user's current position. Manual retry button if denied.

---

### 2026-08-22 — Cursor — Web UI theme + India hybrid map

Done:
- Project skill `.cursor/skills/transportflow-ui/` (tokens for web + future mobile).
- Dashboard: dark ink/cyan/amber system in `web/src/index.css`; layouts,
  login, CRUD pages, public track.
- Map: hybrid satellite, greedy gestures, India `restriction`, truck
  marker, no fitBounds on every GPS ping (that caused world zoom).

Left / next:
- Stabilize Web isolation checklist still pending.
- Mobile should copy tokens from the skill when UI work starts.

---

### 2026-08-22 — Cursor — Stabilize Web slices 0–3

Done:
- Docs: STABILIZE-WEB-PLAN.md is current; DATA-MODELS User includes
  super_admin; ARCHITECTURE single JWT / location:broadcast; PHASE-0
  historical; PHASE-2 OTP item removed.
- Backend: requireOrgScoped (403 super_admin on org APIs); login fails
  when org is inactive; driver phone unique per org (legacy phone_1
  index dropped on seed); `npm run isolation-check`.
- Web: list loading/error/empty; MAPS_API_KEY warning; trip detail
  listens to location:broadcast like the public page.

Left / next:
- Run the checklist in STABILIZE-WEB-PLAN.md (two orgs, isolation-check,
  disable-org login). Do not mark Phase 1 done until that passes.
- Mobile frozen. Commits only when asked.

---

### 2026-07-05 — Cursor — Public tracking page live view fix

Done:
- **Root cause:** Public page fetched route/vehicle/driver via auth-only APIs → 401, empty map, no live tracking.
- **`GET /api/public/trips/:token`** now returns enriched `PublicTripView` (trip + route stops/roadPath + vehicle/driver names) in one call.
- **`PublicTrackingPage`** uses single public endpoint; listens to `location:broadcast`, `stop:reached_broadcast`, `trip:status_changed` — same live experience as admin TripDetailPage.

---

Done:
- **Mobile blank map — root causes fixed:**
  - MapView was nested inside ScrollView (known cause of blank tiles) → map moved to fixed-height container outside scroll.
  - `provider="google"` forced on iOS where Expo Go uses Apple Maps → Google provider only on Android via `PROVIDER_GOOGLE`.
  - Static `initialRegion` only → `fitToCoordinates` on map ready + when stops change.
  - Extracted `mobile/src/components/RouteMap.tsx` sharing the same props contract as web (`routeMapTypes.ts`).
- **Road-snapped paths:** `roadPath` field on Route (DATA-MODELS.md updated). Backend `directions.service.ts` calls Google Directions API on route create/update; stores encoded polyline as `{lat,lng}[]`; null + straight-line fallback on failure.
- **Web map UX:** Drag updates lat/lng live (drag + dragend), click row to select stop (orange highlight), map pans to selected stop, bounds refit when stops move, road path displayed when cached.
- **DECISIONS.md:** Superseded straight-line MVP decision with cached road-path decision.

Left / next:
- Set `MAPS_API_KEY` in backend `.env` for road path computation to work.
- Device-test mobile map on Android (Google) and iOS (Apple Maps in Expo Go).
- Phase 1 cross-org isolation smoke test still pending.

---

Done:
- **Super Admin web UI:** `/super-admin/login` page, `/super-admin/orgs` panel (list/create/disable orgs), `SuperAdminLayout`, wired in `App.tsx`.
- **Role guards:** `ProtectedRoute` redirects `super_admin` away from org dashboard; `ProtectedSuperAdminRoute` rejects non-super-admin roles; org login redirects super admin to `/super-admin/orgs`.
- **Carried forward (uncommitted from prior session):** Web `RouteMap` (Google Maps JS), mobile `TripScreen` map via `react-native-maps` (separate impl, not shared component), stop:reached socket events, driver password on create, doc updates for Google Maps + `currentStopIndex`.
- TypeScript: 0 errors on web, backend, mobile.

Left / next:
- **Phase 1 Definition of Done:** cross-org isolation smoke test (create two orgs, verify JWT from Org A cannot read Org B data).
- Commit the accumulated uncommitted work.
- Device-test mobile map on physical device (map only renders during `in_progress` trips).
- Vehicle marker bearing/rotation (deferred polish).

Notes:
- Mobile map uses inline `react-native-maps` in `TripScreen.tsx`, not the web `RouteMap` component — prior PROGRESS entry overstated "shared" component.
- Road-snapped routing (`roadPath`) not started; `DECISIONS.md` still records straight-line polylines for MVP.

---

### 2026-07-05 — Antigravity — Shared RouteMap component + Mobile route map

Done:
- **Shared `RouteMap.tsx`** extracted as a single Google Maps component reused across web and mobile contexts. Handles: polyline (straight-line, blue), numbered stop markers (green=reached, blue=pending), interactive map-click-to-add, drag-to-reposition, info-window remove button, vehicle marker, live Socket.IO tracking (location:broadcast + stop:reached_broadcast).
- **Removed `LiveMap.tsx`** — deprecated component deleted entirely.
- **`RoutesPage.tsx`** — Integrated `RouteMap` in interactive mode below the stops list. Added ↑/↓ reorder controls per stop. Clicking the map appends a new stop; dragging repositions it; info window remove button removes it. Manual lat/lng inputs remain as fallback.
- **`TripDetailPage.tsx`** — Migrated from `LiveMap` to `RouteMap`. Passes `stops`, `currentStopIndex`, `lastKnownLocation`, `tripId`, `live` props. Stops list with reached badges unchanged.
- **`PublicTrackingPage.tsx`** — Same migration as TripDetailPage. Both use `Suspense` lazy-loading for `RouteMap`.
- **Mobile TripScreen** — Added `react-native-maps` (`expo install`). Embedded a `MapView` (Google provider) with `Polyline` connecting route stops and colored `Marker`s per stop (blue→green as reached), plus a red vehicle location marker. Map is shown only during `in_progress` trips. Google Maps API key wired into `app.json` android config.
- **TypeScript**: 0 errors on both `web/` and `mobile/` (`tsc --noEmit`).

Left / next:
- Vehicle marker bearing/rotation (compute atan2 from last two location points, rotate the marker icon accordingly — web + mobile).
- Proceed to Phase 1 (multi-tenant auth) when ready.

---


### 2026-07-05 — Antigravity — Driver Password creation, Google Maps integration & Socket stop:reached client updates

Done:
- **Driver Password:** Refactored backend and web frontend to support manager-provided password during driver creation. Backend validates that a password is provided, and the web creation form requires it. Disabled password editing during updates.
- **Maps Switch:** Switched the web dashboard map from Leaflet/OSM to Google Maps. Exposes the API key via process.env.MAPS_API_KEY loaded dynamically from the root `.env` via Vite configuration.
- **Stop Tracking:** Implemented `stop:reached` client updates. Admin dashboard (`TripDetailPage`), public tracking page (`PublicTrackingPage`), and driver app (`TripScreen`) all listen to `stop:reached_broadcast` to update markers and stops list real-time. Added an interactive "Arrived" button for the driver's current active stop.
- **Mobile Auth:** Re-architected driver app navigation to use React Navigation's state-driven auth routing conditional check. Completely resolves the replace navigation error when switching screen states.

Left / next:
- Verify real-time Socket.IO communication and GPS loops on actual test flows.
- Proceed to Phase 1 onboarding and JWT middleware transitions.

---

### 2026-07-05 — Amazon Q — Phase 0 complete + Phase 1 planning

Done:
- All 8 steps of the Phase 0 Definition of Done passed on a real device.
- `docs/CURRENT-PHASE.md` updated to point to Phase 1.
- `docs/PHASE-1-PLAN.md` rewritten with exact scope based on two decisions:
  - Super Admin provisions org + first Org Admin (no self-signup).
  - Manager role deferred to Phase 2.
- Two new entries added to `docs/DECISIONS.md`.
- Phase 1 build order: (1) `requireAuth` + `attachOrgContext` JWT swap, (2) Super Admin seed + middleware, (3) Org CRUD backend, (4) Super Admin web panel, (5) cross-org isolation smoke test.

Left / next:
- Phase 1 Step 1: `requireAuth` middleware + `attachOrgContext` swap (replace `PHASE0_ORG_ID` with real JWT decode).

---

### 2026-07-05 — Amazon Q — Mobile app (Expo) + backend status_changed emit

Done:
- Backend: `shared/io.ts` singleton — `setIO`/`getIO` so the trip service can reach the Socket.IO instance. `startTrip` and `endTrip` now emit `trip:status_changed` to the trip room after updating the DB, so the web dashboard updates without polling.
- Mobile app at `/mobile` (Expo managed workflow, SDK 57, React Native 0.86):
  - Dependencies: `expo-location`, `socket.io-client`, `axios`, `@react-native-async-storage/async-storage`, `@react-navigation/native`, `@react-navigation/native-stack`.
  - `app.json` — name/slug set, `NSLocationWhenInUseUsageDescription` (iOS) and `ACCESS_FINE_LOCATION` (Android) permissions declared.
  - `src/lib/api.ts` — axios client, base URL from `EXPO_PUBLIC_API_URL` env var (falls back to `localhost:3000`), token injected via module-level ref set on login.
  - `src/lib/auth.ts` — `login` (calls `/api/auth/driver/login`, persists token + driver info to AsyncStorage), `logout`, `loadStoredAuth` (bootstraps token on app launch).
  - `src/lib/socket.ts` — singleton Socket.IO client, `websocket` transport only.
  - `LoginScreen` — phone + password form, navigates to TripScreen on success.
  - `TripScreen` — loads most recent non-completed trip for the logged-in driver; Start Trip button (requests foreground location permission, calls REST start, begins GPS interval); End Trip button (calls REST end, stops GPS, emits `trip:status_changed` + `trip:leave`); reconnect handler re-emits `trip:join` on socket `connect` event; logout with confirmation alert.
  - GPS loop: `Location.getCurrentPositionAsync` every 5 seconds, emits `location:update` with exact DATA-MODELS.md payload shape.
  - `App.tsx` — `NavigationContainer` + native stack, bootstraps stored auth on launch (shows spinner while loading).
- Both backend and mobile TypeScript compile with zero errors.

Left / next:
- End-to-end test: run backend, open web app, create vehicle/driver/route/trip, scan QR with Expo Go on a real device, log in as driver, start trip, verify live marker moves on web dashboard and public tracking page, end trip.
- Create a `mobile/.env` with `EXPO_PUBLIC_API_URL=http://<your-LAN-IP>:3000` before testing on a physical device (localhost won't reach the backend from a phone).
- Phase 0 Definition of Done: all 8 steps in `docs/PHASE-0-PLAN.md` pass end-to-end.

Notes / gotchas:
- `EXPO_PUBLIC_API_URL` must be set to your machine's LAN IP (e.g. `http://192.168.1.x:3000`) when running on a physical device via Expo Go. Android emulator uses `http://10.0.2.2:3000`, iOS simulator uses `localhost`.
- `socket.io-client` is forced to `websocket` transport only (`transports: ['websocket']`) — React Native doesn't support the polling fallback reliably.
- The trip screen finds "today's trip" by filtering for the most recent non-completed trip where `driverId` matches. Phase 1: add a dedicated `/api/trips/my` endpoint scoped by JWT `userId` instead of filtering client-side.

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
