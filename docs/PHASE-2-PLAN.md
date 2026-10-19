# TransportFlow — Phase 2 Plan (Polish + Multi-Org Readiness)

> Do not start until Phase 1 is done and `docs/CURRENT-PHASE.md` points
> here. This phase intentionally comes BEFORE any vertical work — it
> makes the core solid enough that onboarding two or three different
> businesses on it won't immediately surface bugs.

## Goal

Take the core from "works for one test org" to "ready to hand to a real
paying business," without adding any vertical-specific features yet.

## In Scope

**Backend**
- [ ] Trip history / breadcrumb trail (the `LocationBreadcrumb` model
      from `docs/DATA-MODELS.md`, previously deferred) — needed once
      real orgs want to review past trips, not just watch live ones
- [ ] TTL index on breadcrumbs (decide retention window — 30-90 days)
- [ ] Basic error handling audit — consistent error response shape
      across all endpoints (this tends to be inconsistent after Phase
      0/1's fast iteration, worth a deliberate pass)
- [ ] Input validation audit on all CRUD endpoints (Phase 0/1 likely
      trusted input more than production should)
- [ ] Rate limiting on auth login endpoints (OTP was superseded; do not
      add OTP rate limits)

**Web**
- [ ] Trip history page (list past trips per org, view route playback
      using breadcrumb data)
- [ ] Basic empty/error/loading states audited across all pages — Phase
      0/1 likely only handled the happy path
- [ ] Org Admin can view basic counts (active vehicles, drivers, trips
      today) — not full reporting, just enough to not feel like a blank
      dashboard

**Mobile**
- [ ] Handle edge cases: driver with no assigned vehicle, trip cancelled
      mid-drive, app killed and reopened mid-trip (does it correctly
      resume or clearly show trip ended?)

## Explicitly Out of Scope

- Any vertical-specific entity (still — this phase is core polish only)
- Notifications
- Analytics/reporting beyond basic counts
- Payments/billing

## Definition of Done

You'd be comfortable handing a login to a real business owner (not a
developer) and having them use it for a day without needing you on call
for a broken empty state or an unhandled error.

## What comes after this phase

Once Phase 2 is done, the next phase is the **first real vertical**,
following `docs/VERTICAL-ONBOARDING-TEMPLATE.md`. Which vertical goes
first should be decided based on which business you actually have a
conversation lined up with — write that decision into
`docs/DECISIONS.md` when it's made, along with a new
`docs/PHASE-3-VERTICAL-<name>.md` file created from the template.
