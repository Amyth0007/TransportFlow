---
name: transportflow-ui
description: >-
  TransportFlow visual system — colors, type, motion, map (India-only hybrid
  satellite, truck vehicle marker), and dashboard patterns. Use when building
  or restyling web or mobile UI, maps, login, layout, cards, tables, buttons,
  badges, or when the user mentions theme, design, colors, or 2026 UI.
---

# TransportFlow UI

Canonical tokens: [tokens.md](tokens.md). Web CSS: `web/src/index.css`. Map
constants: `web/src/lib/routeMapTypes.ts` (`INDIA_BOUNDS`, zoom clamps).

Do not invent a second palette. Mobile must use the same hex values.

## Rules

- Dark operations UI (ink + teal), not gray Bootstrap.
- No new UI libraries (Framer, MUI). CSS + Tailwind v4 `@theme`.
- Maps: Google **hybrid** (satellite + labels), **India restriction**,
  greedy gestures, truck icon for the vehicle — never a red arrow.
- Do not `fitBounds` on every live GPS ping; pan the vehicle only.
- Stop markers stay as numbered pins. The line between them is a driving
  road path (Directions steps), like in-car navigation — not a straight
  cut between points. Do not replace pins with Directions A/B markers.
- After fitBounds, clamp zoom to `MAP_MIN_ZOOM`–`MAP_FIT_MAX_ZOOM`.
- New routes: request browser geolocation; if allowed and inside India,
  stop 1 is the user's current position.
- Add stops by Google Places search (India), same MAPS_API_KEY; enable
  Places API on the key.

## Web classes (index.css)

| Class | Use |
|---|---|
| `tf-shell` | Full-viewport app background |
| `tf-enter` | Page mount fade/slide |
| `tf-card` | Panels, forms, tables |
| `tf-field` | Inputs and selects |
| `tf-btn` / `tf-btn-primary` / `tf-btn-ghost` / `tf-btn-danger` | Actions |
| `tf-nav` / `tf-nav-active` | Sidebar links |
| `tf-badge-live` / `tf-badge-ok` / `tf-badge-warn` / `tf-badge-muted` | Status |
| `tf-map-frame` | Map container (rounded, ring, min-height) |
| `tf-title` / `tf-kicker` | Headings |

## Mobile (when unfrozen)

Copy hex from tokens.md into React Native `StyleSheet`. Map: same India
bounds, hybrid if the native SDK allows, same truck PNG/SVG asset.
Do not use Leaflet, OSM, or a different accent color.
