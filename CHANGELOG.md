# Changelog

## v0.2.0 — Filter, sort, and producer grouping (2026-02-16)

### Added

- Filter dashboard by wine type (red, white, sparkling, dessert)
- Filter dashboard by producer
- Sort by vintage (ascending/descending) or date added (newest/oldest)
- "More from this producer" link on wine detail page
- Deep-linking to filtered views via URL query params (`?type=`, `?producer=`)
- Filtered bottle count shown when filters are active ("6 of 12 bottles")

## v0.1.0 — Core inventory tracking (2026-02-16)

### Added

- Dashboard view with wine list and total bottle count
- Add wine form (type, producer, name, vintage, bottles, notes)
- Wine detail view with read-only display and edit mode
- Bottle count adjustment (+1 / -1) on wine detail
- Delete wine with confirmation
- IndexedDB persistence via idb-keyval
- JSON Schema validation (2020-12 draft) on every mutation
- Installable PWA with service worker (precache)
- Offline-capable SPA with static adapter
