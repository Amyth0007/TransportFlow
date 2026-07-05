# TransportFlow — Phase 1 Plan (Organization Layer & Real Auth)

> Phase 0 Definition of Done passed on a real device on 2026-07-05.
> `docs/CURRENT-PHASE.md` now points here.

## Goal

Replace every Phase 0 shortcut that only worked because there was one
hardcoded org, with the real multi-tenant version — without changing the
shape of anything controllers already depend on.

Two decisions made before this phase started (see `docs/DECISIONS.md`):
- Org onboarding: Super Admin provisions the org and creates the first
  Org Admin. No self-signup.
- Manager role: deferred to Phase 2. Phase 1 has Super Admin and
  Org Admin only.

## In Scope

### Backend

- [x] `attachOrgContext` middleware swap: replace `PHASE0_ORG_ID` env
      read with real JWT verification. Extract `organizationId` from the
      token payload, assign to `req.org`. **Zero controller changes** —
      this is the entire point of the stub pattern.
- [x] `requireAuth` middleware: reusable guard that verifies the JWT and
      attaches `req.user = { userId, role, organizationId, orgType }`.
      Applied to all `/api` routes except `/api/auth/*` and
      `/api/public/*`.
- [ ] Super Admin role: hardcoded in JWT (`role: "super_admin"`), seeded
      once. Super Admin is not scoped to any org.
- [ ] Organization CRUD (Super Admin only):
      `POST /api/admin/orgs` — create org + first Org Admin in one call
      (name, orgType, adminName, adminEmail, adminPassword).
      `GET /api/admin/orgs` — list all orgs.
      `PATCH /api/admin/orgs/:id/disable` — set `isActive: false`.
- [ ] `requireSuperAdmin` middleware: rejects any token whose role is
      not `super_admin`.
- [ ] Driver login scoped to org: `POST /api/auth/driver/login` already
      works; verify it correctly rejects a driver token used against a
      different org's data (covered by the `attachOrgContext` swap).
- [ ] Cross-org isolation smoke test: manually verify (or write a
      one-off script) that a JWT from Org A cannot read Org B's
      vehicles/drivers/routes/trips.

### Web

- [ ] Super Admin login page (`/super-admin/login`) — separate from the
      Org Admin login, same email+password form, routes to the Super
      Admin panel on success.
- [ ] Super Admin panel (`/super-admin/orgs`):
      - List all orgs (name, orgType, isActive, createdAt).
      - "Create org" form: org name, orgType, first admin name, email,
        password. Single submit creates both org and admin in one call.
      - "Disable" button per org row.
- [ ] `ProtectedSuperAdminRoute` component — same pattern as
      `ProtectedRoute` but checks `role === "super_admin"` from the
      decoded token.
- [ ] Org Admin login: already works (`/login`). Confirm it still works
      after the `attachOrgContext` swap — no changes expected.
- [ ] Confirm no org data leaks in the existing dashboard: all pages
      already read from `req.org.organizationId` on the backend, so
      this should be a no-op verification, not a code change.

## Explicitly Out of Scope for Phase 1

- Manager role (Phase 2)
- Billing / subscription per org
- Any vertical-specific entity
- Notifications
- Fine-grained permissions beyond super_admin / org_admin
- Password reset / forgot-password flows
- Org Admin self-signup

## Build Order

1. `requireAuth` middleware + `attachOrgContext` JWT swap → commit,
   show pattern, wait for go-ahead.
2. Super Admin seed entry + `requireSuperAdmin` middleware.
3. Org CRUD backend (service + controller + router).
4. Super Admin web panel (login page + orgs page).
5. Smoke-test cross-org isolation, update PROGRESS.md, mark done.

## Definition of Done

Two separate organizations exist simultaneously. Each has its own Org
Admin, drivers, vehicles, routes, and trips. A JWT from Org A cannot
read or write Org B's data — verified by creating two orgs via the
Super Admin panel and attempting cross-access.

## Migration Note

Phase 0's seeded org (`TransportFlow Demo Org`) and its admin
(`admin@transportflow.local`) become the first real org. No data
migration needed — `organizationId` was on every document from day one.
The seed script gains a Super Admin user entry; the existing Org Admin
entry stays as-is.
