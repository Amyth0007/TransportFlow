# TransportFlow — Coding Conventions

> Follow these in every session, regardless of which tool (Cursor,
> Claude Code, Antigravity) is being used, so the codebase feels like it
> was written by one person.

## General

- TypeScript strict mode, everywhere (backend, web, mobile).
- Prefer minimal, targeted changes over rewrites — do not refactor code
  outside the scope of the current task unless explicitly asked.
- Async/await only, no `.then()` chains, no callback-style code.
- No new npm/yarn dependency without a one-line justification in the
  commit message or PR description — keep the dependency tree small for
  a solo-maintained MVP.

## Backend

- Every route handler reads `organizationId` from the JWT, never from
  request params/body.
- Business logic lives in service files, not directly in route
  controllers — controllers stay thin (parse request, call service,
  return response).
- All Mongoose schemas live in `/shared/models`, matching
  `docs/DATA-MODELS.md` exactly. If a field needs to change, update
  `docs/DATA-MODELS.md` in the same task/commit.
- Socket.IO event names and payloads must match
  `docs/DATA-MODELS.md` exactly — don't invent new event names ad hoc.

## Web

- Functional components + hooks only, no class components.
- Data fetching: keep it simple for MVP (fetch/axios + useEffect or a
  lightweight query lib) — don't introduce a heavy state management
  library unless the app's complexity actually demands it.
- Public routes (like `/track/:token`) must never import or depend on
  any authenticated-only context/provider.

## Mobile (Expo)

- Use `expo-location` for foreground GPS — don't reach for a bare React
  Native geolocation library, stay within the Expo managed workflow.
- Keep navigation simple: login → driver dashboard → active trip screen.
  Don't build screens not listed in the current phase plan.

## Commits / PRs

- Small, single-purpose commits. One feature or fix per commit.
- Commit message states what changed and why in one line — this is
  cheap insurance against a future AI session misreading intent from
  the diff alone.

## When in doubt

If a task isn't clearly covered by `docs/PHASE-0-PLAN.md` (or the
current phase file) or contradicts something in `docs/DECISIONS.md`,
stop and ask rather than guessing or expanding scope.
