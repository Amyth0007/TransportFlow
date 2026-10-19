# TransportFlow — Phase 0 Plan (Core Tracking Engine)

> HISTORICAL. Phase 0 is complete (2026-07-05). Current work is
> `docs/CURRENT-PHASE.md` → `docs/STABILIZE-WEB-PLAN.md`.
> Do not treat this file as the live scope. Maps: Leaflet below was
> superseded by Google Maps (`docs/DECISIONS.md`).

## Goal

Prove the core tracking loop works end-to-end: a driver starts a trip on
their phone, GPS streams live, an admin sees it move on a dashboard, and
anyone with a public link sees it too. No org management, no verticals,
no notifications.

## In Scope

**Backend**
- [ ] Vehicle CRUD (create, list, update, deactivate)
- [ ] Driver CRUD (create, list, update, deactivate)
- [ ] Driver auth: phone + password login (manager-generated), returns JWT
- [ ] Route CRUD (name + ordered stops with lat/lng)
- [ ] Trip: create (select route + vehicle + driver + schedule time),
      start, end, list
- [ ] On Trip creation: generate `publicTrackingToken` (random UUID)
- [ ] Socket.IO server: `trip:join`, `trip:leave`, `location:update`,
      `location:broadcast`, `trip:status_changed` (exact payloads in
      `docs/DATA-MODELS.md`)
- [ ] Update `Trip.lastKnownLocation` on every location update (simple
      overwrite, no history needed yet)
- [ ] Single hardcoded organization — no multi-tenant auth logic yet

**Web App**
- [ ] Admin login (email + password — hardcode one admin user for now,
      or simple seed script)
- [ ] Vehicles page (list, add, edit)
- [ ] Drivers page (list, add, edit)
- [ ] Routes page (list, add, edit — simple form, add stops with
      lat/lng, no map-click-to-add-stop UI needed yet, that's a
      nice-to-have)
- [ ] Trips page (list, create trip, view trip detail with live map)
- [ ] Live map on trip detail page: Leaflet + Socket.IO, joins
      `trip_<tripId>` room, shows moving marker
- [ ] Public tracking page at `/track/:token`: no auth, read-only,
      shows the same live marker + basic trip info (vehicle number,
      driver name, route name)
- [ ] "Copy tracking link" button on the trip detail page

**Mobile App (Expo, driver-only)**
- [ ] Login screen (phone + password)
- [ ] Today's trip screen (shows assigned trip if one exists, empty
      state if not)
- [ ] Start Trip button → begins foreground GPS tracking (expo-location)
      and emits `location:update` on an interval (start with every 5-10
      seconds, tune later)
- [ ] End Trip button → stops GPS, emits final `trip:status_changed`
- [ ] Basic reconnect handling: re-emit `trip:join` if socket reconnects
      mid-trip

## Explicitly Out of Scope for Phase 0

- Organization model / multi-tenancy (Phase 1)
- Any vertical-specific entity or field (Order, Student, etc.)
- Notifications (SMS or push)
- Trip history / playback / breadcrumb trail (live location only)
- Background GPS tracking
- Redis / multi-server socket scaling
- Manager role (Org Admin only for now)
- Password reset flows, forgot-password UI (skip for MVP, reset
  manually in DB if needed)

## Definition of Done for Phase 0

You can, with zero manual DB edits beyond initial seed data:
1. Log in as admin on the web app
2. Create a vehicle, a driver, and a route with stops
3. Create a trip assigning that vehicle/driver/route
4. Copy the trip's public tracking link
5. Log in as that driver on the mobile app (Expo Go or a dev build)
6. Start the trip — GPS begins streaming
7. See the vehicle move live on both the admin dashboard and the public
   tracking link, opened in an incognito browser tab
8. End the trip — both views show "completed"

If all 8 steps work with a real phone moving (or a GPS mock), Phase 0 is
done. Update `docs/PROGRESS.md` and move to Phase 1 planning.
