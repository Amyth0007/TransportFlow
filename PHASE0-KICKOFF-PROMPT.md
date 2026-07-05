# Phase 0 Kickoff Prompt

Paste this into Cursor / Claude Code / Antigravity as your first message
in a fresh session, once the `docs/`, `CLAUDE.md`, `.cursorrules`, and
`AGENTS.md` files are committed to the repo.

---

**Prompt:**

> Read `docs/VISION.md`, `docs/ARCHITECTURE.md`, `docs/DATA-MODELS.md`,
> `docs/DECISIONS.md`, `docs/CONVENTIONS.md`, `docs/PHASE-0-PLAN.md`, and
> `docs/PROGRESS.md` before doing anything else.
>
> We are starting Phase 0 from scratch. Set up the initial project
> structure for the backend only, in this order:
>
> 1. Node.js + Express + TypeScript project, matching the folder
>    structure in `docs/ARCHITECTURE.md`
> 2. MongoDB connection (Mongoose) using an env variable for the
>    connection string
> 3. The five Mongoose schemas from `docs/DATA-MODELS.md`: Organization,
>    User, Driver, Vehicle, Route, Trip — exactly as specified, no extra
>    fields
> 4. A single seed script that creates one hardcoded Organization and one
>    Org Admin user, so I can log in immediately
> 5. Vehicle CRUD REST endpoints only (skip Driver/Route/Trip for this
>    task — we'll do those next)
>
> Stop after step 5 and show me what you built before continuing to
> Driver, Route, and Trip endpoints — I want to review the pattern first
> since everything after this will copy it.
>
> After I approve, append an entry to `docs/PROGRESS.md` describing what
> you built.

---

## Why kick off this way instead of "build the whole backend"

- Reviewing after the first CRUD module (Vehicle) means you catch
  pattern problems (naming, error handling, tenant isolation approach)
  once, before they're copy-pasted into four more modules.
- Explicitly listing the 5 schemas up front stops the model from
  inventing a 6th "just in case" collection.
- The "stop and show me" instruction is the single most effective
  anti-hallucination lever for agentic tools — it forces a checkpoint
  instead of letting the session run ahead on its own assumptions for an
  hour.

## Suggested follow-up prompts (same session, after approval)

1. "Now add Driver CRUD + OTP login, following the same pattern as
   Vehicle. Use a fake/console-logged OTP for now, don't wire up MSG91
   yet — that's a separate task."
2. "Now add Route CRUD, following the same pattern."
3. "Now add Trip: create/start/end endpoints, plus the Socket.IO server
   with the events from `docs/DATA-MODELS.md`."
4. Switch to the `/web` folder in a fresh session (or same one): "Read
   the docs again, then build the admin login page and Vehicles page,
   calling the backend endpoints we just built."
5. Switch to `/mobile`: "Read the docs again, then build the driver login
   screen and today's-trip screen using Expo and expo-location for
   foreground GPS."

Always start a new tool/session with "Read the docs first" as the literal
first instruction — even mid-project. It costs a few seconds and is the
cheapest insurance against hallucinated scope.
