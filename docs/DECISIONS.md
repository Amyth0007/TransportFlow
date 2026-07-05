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
Leaflet/Socket.IO integration examples.

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

### 2026-07-05 — Switch Driver Auth to Phone + Password (manager-generated)
Supersedes the phone + OTP login design for the MVP. Instead of requesting and verifying OTPs,
the manager auto-generates a random secure password when creating the Driver in the system. The plaintext password is shown once to the manager to share with the driver.

**Rationale:**
- Simpler implementation for Phase 0 (no SMS provider integration overhead, no complex mocks).
- Trivial onboarding loop: the manager is already creating the Driver record, so handing over a password at that moment requires zero additional workflows.
- No forgot-password or self-reset flow is required for the MVP; password can be reset by the manager if lost.

