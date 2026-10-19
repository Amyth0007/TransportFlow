# TransportFlow — Stabilize Web (current work)

> Process reset, not a greenfield rewrite. Keep the existing core.
> Mobile, Phase 2, and verticals are frozen until the web checklist below
> passes. See `docs/CURRENT-PHASE.md`.

## Goal

Make docs match the code, finish the missing Phase 1 isolation pieces,
and make the org-admin dashboard + public tracking page reliable.
Do not add features.

## Freeze

- Phase 2 (breadcrumbs, dashboards, extra polish)
- Verticals, refresh tokens, notifications, Redis, marker rotation
- Visual redesign of web was explicitly requested (2026-08-22); follow
  `.cursor/skills/transportflow-ui/SKILL.md`.
- Mobile UI unfrozen 2026-08-22 (driver home + trip). Do not add
  verticals, push, or background GPS.
- Git commits unless the developer explicitly asks

## Slices

0. Docs truth (this file + DATA-MODELS / ARCHITECTURE / phase pointers)
1. Capture git tree — skipped until asked
2. Backend: reject super_admin on org APIs; block login for disabled orgs;
   unique driver phone per org; isolation check script
3. Web: loading / error / empty on list pages; maps key warning; trip
   detail live location same as public page
4. Sign-off checklist below → then mark Phase 1 done
   (mobile driver flow started in parallel by request)

## Web sign-off checklist

1. Super Admin creates Org B (seed Org A remains).
2. Org A: vehicle, driver, route (2+ stops), trip.
3. Start trip in admin; public link shows `in_progress` (location may be
   still without a phone).
4. End trip; admin detail and public page both show `completed`.
5. Org A JWT cannot read Org B (`npm run isolation-check` in `/backend`
   after two org admins exist).
6. Disabled org admin cannot log in.

## Explicit non-goals

Greenfield rewrite; sharing one RouteMap with React Native; manager
role; billing; verticals.
