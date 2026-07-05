# TransportFlow — Vertical Onboarding Template

> This is not a phase file — it's a reusable pattern. Every vertical
> (gas delivery, school bus, corporate shuttle, whatever comes after)
> follows these same steps. Copy this checklist into a new
> `docs/PHASE-N-VERTICAL-<name>.md` file when a specific vertical
> actually starts, and fill in the specifics there. This file itself
> never gets "done" — it's the recipe, not an instance of it.

## The Rule

**The core (`docs/DATA-MODELS.md` core schemas, `/core` folder) does not
change when a vertical is added.** If adding a vertical seems to require
modifying Vehicle, Driver, Route, or Trip's core fields, stop — that's a
sign the "vertical" idea actually belongs in the core, and needs a
conscious decision (logged in `docs/DECISIONS.md`), not a quiet schema
edit.

## Steps to Onboard Any New Vertical

1. **Define the vertical-specific entity.** What is being tracked beyond
   "a vehicle on a route"? (Order for gas, Student for school, Employee
   for corporate.) Add its schema to `docs/DATA-MODELS.md` under a new
   "Vertical: <name>" heading — never inside the core schemas section.

2. **Define the stop-confirmation behavior.** What marks a Trip's stop as
   "done" for this vertical? (Delivery confirmed / student picked up /
   employee checked in.) This lives in `/backend/src/verticals/<name>/`,
   not in `/core/trip`.

3. **Extend the public tracking page, don't fork it.** The `/track/:token`
   page should show vertical-specific info (e.g. "3 of 5 deliveries
   complete") as an optional extra section, driven by `orgType` on the
   Trip/Organization — the base live-map view stays identical across all
   verticals.

4. **New Organizations of this type set `orgType` accordingly.** No new
   Organization fields needed unless the vertical genuinely requires
   org-level settings (e.g. gas agencies might set a default delivery
   radius) — if so, that's an optional field on Organization, not a
   required one, since other verticals won't use it.

5. **Write a `docs/PHASE-N-VERTICAL-<name>.md` file** using this same
   In Scope / Out of Scope / Definition of Done structure as the core
   phase files, so it gets the same rigor.

6. **Update `docs/CURRENT-PHASE.md`** to point at it when work starts.

## Anti-pattern to avoid

Do not let the first vertical's needs quietly become "how core Trip
works." If gas delivery needs an OTP-on-delivery step, that OTP field
belongs on the gas-specific entity, not bolted onto the core Trip schema
"just for now." The whole point of the core/vertical split is that a
school bus Trip should never carry a field that only makes sense for gas
cylinders.
