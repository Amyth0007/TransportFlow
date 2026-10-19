# TransportFlow — Decisions Log

> Settled decisions, with rationale. If an AI assistant is about to
> suggest something that contradicts an entry here, it should flag the
> contradiction and ask, not silently override it. New decisions get
> appended at the bottom with a date — never delete old entries, mark
> them superseded instead if they change.

---

### 2026-07-05 — Platform is multi-vertical from day one, but core is vertical-agnostic
Multiple similar businesses (gas delivery, school buses, corporate
shuttles) will run on one shared platform. Core entities (Vehicle,
Driver, Route, Trip) must never contain vertical-specific fields or
naming. Vertical-specific logic goes in `/verticals`, added later, one at
a time, without modifying the core.

### 2026-07-05 — No end-customer accounts; public tracking link instead
Gas customers / parents / employees do not get logins, roles, or a
mobile app screen. Instead, each Trip has a `publicTrackingToken` (random
UUID) and a public, unauthenticated web page at `/track/:token` that
joins the same Socket.IO room as the admin dashboard. Simpler, faster to
ship, and better UX for non-technical end users (no install/login
friction). Revisit only if a paying customer specifically requests
persistent history or accounts.

### 2026-07-05 — No push notifications in MVP
Cut entirely for now. If needed later, SMS via the existing MSG91/AWS SES
integration is the fallback before building FCM push.

### 2026-07-05 — Foreground-only GPS tracking for MVP
Background location tracking (Android especially) has real
permission/battery-kill complexity. Foreground-only (app must be open)
ships faster and is sufficient to validate the core tracking loop.
Background tracking is a deliberate future upgrade, not a retrofit.

### 2026-07-05 — Expo managed workflow for React Native
Faster iteration (OTA updates, EAS build pipeline) outweighs the native
module flexibility of bare React Native, which isn't needed yet.

### 2026-07-05 — Single Socket.IO instance, no Redis adapter yet
Sufficient for dozens of concurrent trips on one server. Redis pub/sub
adapter is a scaling step to take only when running more than one backend
instance — not before.

### 2026-07-05 — Single hardcoded organization for Phase 0
Multi-tenancy (real Organization model, org-scoped auth) is Phase 1.
Phase 0 proves the tracking core works end-to-end without that
complexity. Schema still includes `organizationId` from day one so Phase
1 doesn't require a data migration.

### 2026-07-05 — React (not Angular) for the new web app
Amyth's day job uses Angular/PrimeNG, but for this new product React was
chosen: larger ecosystem, easier future hiring, more mature
Leaflet/Socket.IO integration examples. **SUPERSEDED — switched to Google Maps**

### 2026-07-05 — Maps provider selection (Google Maps)
Switching from Leaflet/OpenStreetMap to Google Maps for both web and mobile. API key stored in .env as MAPS_API_KEY.
This enables richer map features and native SDK support in Expo.

### 2026-07-05 — req.org middleware pattern for organizationId propagation
Controllers must never read `organizationId` from env vars, request params,
or body directly. Instead, a single middleware (`attachOrgContext`) sets
`req.org = { organizationId }` before any `/api` route handler runs.

Phase 0 implementation: middleware reads `process.env.PHASE0_ORG_ID`.
Phase 1 migration: replace the middleware body only — verify JWT, extract
`organizationId` from the payload, assign to `req.org`. The shape of
`req.org.organizationId` does not change, so zero controller code needs
editing. This is the pattern to use for every core module (Driver, Route,
Trip, etc.) going forward.

### 2026-07-05 — Driver authentication using Phone + OTP (SUPERSEDED — see entry below)
Initially chosen for better UX on mobile (no password memory overhead for drivers).
Uses a 4-digit code generated and verified on the server, intended to integrate with MSG91 or Fast2SMS.

### 2026-07-05 — Super Admin provisioning flow (no self-signup)
Org onboarding is controlled: a Super Admin creates the organization and
the first Org Admin in a single API call. There is no self-signup flow.

**Rationale:**
- Prevents arbitrary orgs being created on the platform without approval.
- Simpler auth surface — no email verification, no invite tokens, no
  signup form to build or secure.
- Revisit only if the business model shifts to self-serve SaaS.

### 2026-07-05 — Manager role deferred to Phase 2
Phase 1 has two roles only: `super_admin` and `org_admin`. The Manager
role (same permissions as Org Admin minus org settings and admin
creation) is deferred to Phase 2.

**Rationale:**
- Phase 1's goal is purely the auth/multi-tenancy swap. Adding a third
  role adds permission-check surface area without advancing that goal.
- The `role` field is already in the JWT payload and User schema, so
  adding `manager` in Phase 2 requires no schema migration.

### 2026-07-05 — Straight-line polyline route mapping (MVP) **SUPERSEDED — see entry below**

### 2026-07-05 — Road-snapped route path cached on Route document
Route polylines use the Google Directions API to compute a road-following
path through ordered stops. The result is stored as `roadPath` on the Route
document and recomputed only when stops change (create/update), not on every
map view, to control API cost.

**Fallback:** If the Directions API call fails or `MAPS_API_KEY` is missing,
`roadPath` is stored as `null` and all clients draw a straight-line polyline
connecting stops in order.

**Rationale:**
- Road-following paths are significantly better UX for drivers and tracking viewers.
- Caching on the Route document avoids repeated API calls per page load.
- Straight-line fallback keeps the system functional without the API.

### 2026-08-22 — Super Admin cannot call org-scoped APIs
`super_admin` JWTs have no `organizationId`. Org-scoped routes
(`/api/vehicles`, `/api/drivers`, `/api/routes`, `/api/trips`) reject
that role with 403. Super Admin uses `/api/admin/orgs` only.

### 2026-08-22 — Disabled org cannot log in
If `Organization.isActive` is false, Org Admin and Driver login fail
with the same generic invalid-credentials message (do not leak that the
org was disabled). Super Admin login is unchanged.

### 2026-08-22 — Driver phone unique per organization
`phone` must be unique within an `organizationId`, not globally. Two
orgs may use the same phone. Login still looks up by phone among active
drivers (first match); uniqueness per org prevents collisions inside one
tenant. Adding org-id on the driver login form is deferred to mobile.
