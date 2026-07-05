# TransportFlow — Progress Log

> Append a new entry at the TOP after every meaningful coding session, in
> ANY tool (Cursor, Claude Code, Antigravity). This is what lets the next
> session — possibly in a different tool — know what already exists
> without re-reading the entire codebase or guessing. Keep entries short:
> what changed, what's left, anything that surprised you.

---

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
