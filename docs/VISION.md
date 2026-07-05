# TransportFlow — Vision

> Read this first, every session. This file explains WHY the system is
> shaped the way it is. If a decision seems odd, check here before
> "fixing" it.

## What this is

One shared SaaS platform for **any business that operates vehicles on
routes and needs live tracking** — not a product built for one customer
type.

Confirmed target businesses (more will be added over time, this list is
not final):

- Gas cylinder delivery agencies
- School bus operators
- Corporate employee shuttle services
- (Future) courier / general logistics

## The core idea — read this twice

**There is one shared "core" and many "verticals."**

```
TransportFlow Core (vertical-agnostic)
  Organization, User, Vehicle, Driver, Route, Stop, Trip, Live GPS
        │
        ├── Vertical: Gas Cylinder Delivery   (added later)
        ├── Vertical: School Bus Transport     (added later)
        ├── Vertical: Corporate Shuttle        (added later)
        └── Vertical: (whatever comes next)
```

The core has **zero knowledge** of what's being transported. It only
knows: a vehicle, driven by a driver, follows a route, made of stops,
during a trip, broadcasting live location.

A "vertical" is a thin, optional add-on that plugs into the core later —
e.g. an `Order` entity for gas delivery, or a `Student` entity for school
buses. **We are not building any vertical yet.** Phase 0 and Phase 1 are
100% core. Do not add gas-specific or school-specific fields, table
names, or logic anywhere until a vertical phase explicitly starts.

## What "MVP" means right now

Live vehicle tracking, drivers, and routes. Nothing else. See
`docs/PHASE-0-PLAN.md` for exact current scope — that file is the
authority on what to build *this phase*, this file is the authority on
*why the system is shaped the way it is* long-term.

## Explicitly NOT in scope yet (do not build unless asked)

- Any vertical-specific entity (Order, Student, Employee, cylinder
  inventory, attendance, etc.)
- Push notifications
- End-customer accounts/login (we use a public tracking link instead —
  see `docs/DECISIONS.md`)
- Payroll, billing, subscriptions, reporting/analytics
- Background GPS tracking (foreground-only for now)
- Multi-server / Redis socket scaling

## If you are an AI coding assistant reading this

Before writing any code:
1. Read `docs/ARCHITECTURE.md` (tech stack, folder layout)
2. Read `docs/DATA-MODELS.md` (schemas — do not invent new fields, edit
   this file first if a schema genuinely needs to change)
3. Read `docs/DECISIONS.md` (settled decisions — don't re-litigate these)
4. Read `docs/CONVENTIONS.md` (coding style rules)
5. Read `docs/PHASE-0-PLAN.md` (or whichever phase file is current) for
   exact task scope
6. Read `docs/PROGRESS.md` for what has already been built in previous
   sessions

If something you're about to do isn't covered by these docs, stop and
ask the developer rather than guessing.
