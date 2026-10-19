# TransportFlow — Architecture

> Authority on: tech stack, folder structure, how the pieces fit together.
> Update this file whenever a structural decision changes — don't let it
> go stale, an AI session trusts this over its own guess.

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Backend | Node.js + Express + TypeScript | TS from day one, no JS-to-TS migration debt like the PBS codebase |
| Database | MongoDB (Mongoose) | Atlas free tier for MVP |
| Realtime | Socket.IO | Single instance for MVP, no Redis adapter yet |
| Web app | React + TypeScript + Tailwind | Admin dashboard + public tracking page |
| Mobile app | React Native (Expo, managed workflow) | Driver app only, for now |
| Maps | Google Maps | `MAPS_API_KEY` in `.env` — `web/.env`, `mobile/.env` (`EXPO_PUBLIC_MAPS_API_KEY`), `backend/.env`; repo root `.env` optional fallback for web |
| Auth | JWT (single access token) | Org Admin: email+password. Driver: phone+password (set by org admin). No refresh-token flow yet. |
| SMS/OTP | Not in use | Driver OTP was superseded (see `docs/DECISIONS.md`). Do not add MSG91/Fast2SMS until a later phase asks. |
| Hosting (MVP) | Railway or Render (backend), Vercel/Netlify (web) | Cheap tier, upgrade only when needed |

## Repo Structure

```
/backend
  /src
    /core
      /vehicle
      /driver
      /route
      /trip
      /tracking       ← Socket.IO handlers
      /auth
      /organization
    /verticals         ← EMPTY until a vertical phase starts
    /shared
      /middleware      ← tenant isolation, auth guards
      /models
  docs -> ../docs (symlink or just reference, single source of truth lives at repo root)

/web
  /src
    /pages             ← LoginPage, VehiclesPage, DriversPage, RoutesPage,
                         TripsPage, TripDetailPage, PublicTrackingPage,
                         SuperAdminLoginPage, SuperAdminOrgsPage
    /components        ← Layout, RouteMap, route guards
    /lib               ← socket client, api client, auth helpers
  Public route: /track/:token (no auth)

/mobile
  /src
    /screens           ← LoginScreen, HomeScreen, TripScreen
    /components
    /lib
  Driver app: login → assigned trip list → active trip (map + GPS).

/docs                  ← the single source of truth, read by every AI tool
```

## Core Design Rule: Tenant Isolation

Every document in every core collection (except `organizations` itself)
carries an `organizationId`. This is enforced in middleware — never rely
on individual controllers/queries to remember to filter by org. See
`docs/DATA-MODELS.md` for the exact fields, and `docs/CONVENTIONS.md` for
how the query wrapper should work.

Phase 0 used a single seeded org. Phase 1 replaced `PHASE0_ORG_ID` with
JWT `organizationId` on `req.org`. Super Admin tokens have no org;
org-scoped routers must reject `super_admin`. Isolation is verified
during Stabilize Web (see `docs/STABILIZE-WEB-PLAN.md`).

## Real-Time Architecture (MVP)

```
Driver App (Expo)              Web Dashboard / Public Tracking Page
    │                                    │
    │ emit('location:update')          listen('location:broadcast')
    ▼                                    ▲
          Socket.IO Server (single instance)
                      │
                joins room: trip_<tripId>
```

See `docs/DECISIONS.md` for why no Redis/multi-server setup yet, and
`docs/DATA-MODELS.md` for the exact socket event payload shapes.

## Public Tracking Link

A route like `/track/:token` on the web app, unauthenticated, read-only.
Token is a random UUID stored on the Trip document, not the Trip's
database `_id`. See `docs/DATA-MODELS.md` for the Trip schema field, and
`docs/DECISIONS.md` for why this replaces end-customer accounts.
