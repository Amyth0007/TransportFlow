# Current Phase

**Current work: Stabilize Web + driver mobile revamp**
See `docs/STABILIZE-WEB-PLAN.md` for the web isolation checklist (still
required before Phase 1 is signed off). Driver mobile was unfrozen on
request (2026-08-22): login → home trip list → active trip.

**Phase 0 — Core Tracking Engine: COMPLETE** (2026-07-05)
All 8 steps of the Definition of Done passed on a real device.
See `docs/PHASE-0-PLAN.md` for the original (historical) scope.

**Phase 1 — Organization Layer & Real Auth: BUILT, DoD NOT signed off**
Super Admin, JWT `attachOrgContext`, and org CRUD exist. Cross-org
isolation and disabled-org login are part of Stabilize Web. Do not
start `docs/PHASE-2-PLAN.md` until Stabilize Web is done and this file
is updated.

> Update this file the moment a phase is marked done and the next one
> starts. This is the ONE file that changes on a phase transition — no
> other pointer file (CLAUDE.md, .cursorrules, AGENTS.md) needs editing,
> since they all just say "check docs/CURRENT-PHASE.md."
