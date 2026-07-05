# TransportFlow — Phase 1 Plan (Organization Layer & Real Auth)

> Do not start this until Phase 0's Definition of Done is fully met and
> `docs/CURRENT-PHASE.md` has been updated to point here.

## Goal

Replace every Phase 0 shortcut that only worked because there was one
hardcoded org, with the real multi-tenant version — without changing the
shape of anything controllers already depend on.

## In Scope

**Backend**
- [ ] Real Organization CRUD (Super Admin only: create org, disable org,
      list orgs)
- [ ] Org Admin signup/login with email + password (bcrypt hash, real
      JWT issuance)
- [ ] Replace the `req.org` middleware stub's internals: instead of
      reading `PHASE0_ORG_ID` from env, decode the JWT and attach
      `req.org = { organizationId: decoded.organizationId }`. **No
      controller code should need to change** — this is the entire point
      of the stub pattern from Phase 0.
- [ ] Driver login also gets tied to a real organization (was previously
      implicitly single-org)
- [ ] Add `organizationId` filter enforcement tests — confirm a token
      from Org A genuinely cannot read/write Org B's vehicles, drivers,
      routes, or trips
- [ ] Manager role: same permissions as Org Admin except cannot manage
      organization settings, cannot create other admins

**Web**
- [ ] Super Admin panel (separate, simple): create org, disable org,
      view org list
- [ ] Org Admin signup flow (or Super-Admin-provisions-org-then-invites-
      admin flow — decide which, document the choice in
      `docs/DECISIONS.md`)
- [ ] Org switcher removed — a logged-in admin only ever sees their own
      org's data (this should already be true structurally, just confirm
      the UI doesn't leak anything)

## Explicitly Out of Scope for Phase 1

- Billing/subscription per organization
- Any vertical-specific entity
- Notifications
- Fine-grained permission system beyond Admin/Manager

## Definition of Done

Two separate organizations can exist simultaneously, each with their own
admin, drivers, vehicles, routes, and trips, and neither can see or
affect the other's data — verified by actually creating two orgs and
trying to cross-access.

## Migration Note

Phase 0's seed script (hardcoded org) becomes just "the first real org"
— no data migration needed if `organizationId` was already on every
document from Phase 0, which it was (see `docs/DATA-MODELS.md`).
