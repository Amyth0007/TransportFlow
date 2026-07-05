# AGENTS.md — TransportFlow

This is a generic instruction file for any AI coding agent working in
this repo (Antigravity, or any tool that doesn't have its own dedicated
config file).

Before doing ANY task, read in order:

1. `docs/VISION.md` — why the system is shaped this way
2. `docs/ARCHITECTURE.md` — tech stack, folder layout
3. `docs/DATA-MODELS.md` — schemas (single source of truth — don't
   invent fields)
4. `docs/DECISIONS.md` — settled decisions, don't re-litigate these
5. `docs/CONVENTIONS.md` — coding style rules
6. `docs/CURRENT-PHASE.md` — tells you which phase file to read next
7. That phase file itself (e.g. `docs/PHASE-0-PLAN.md`) — exact current
   scope
8. `docs/PROGRESS.md` — what previous sessions already built

Rules:
- Do not introduce scope, libraries, schema fields, or entities that
  aren't in the docs above without asking first.
- If something in the codebase contradicts `docs/DATA-MODELS.md` or
  `docs/DECISIONS.md`, flag it — don't silently pick one and proceed.
- After finishing a task, append an entry to `docs/PROGRESS.md`
  describing what changed, using the template at the top of that file.
- Keep changes minimal and targeted to the current task. Don't refactor
  unrelated code.

Note: this file intentionally duplicates CLAUDE.md and .cursorrules —
all three exist only because different tools look for different
filenames. They must always say the same thing. If you update one,
update all three, or better: keep them all as short pointers to
`/docs` (as they are now) so there's nothing to keep in sync beyond this
pointer text.
