# Changelog

## v0.4.0 — GitHub sync (2026-02-20)

### Added

- Settings view (gear icon on dashboard) for GitHub repository and PAT configuration
- Manual push to private GitHub repo — uploads cellar.json and all AVIF photos
- Manual pull from GitHub repo — downloads and applies remote cellar and photos
- Force-pull with confirmation — discards local changes and overwrites from GitHub
- Unsynced-changes indicator on dashboard (tracked persistently in IndexedDB)
- Pull blocked when local changes exist; force-pull escape hatch shown inline
- Push and pull disabled when offline

## v0.3.0 — Photo capture (2026-02-17)

### Added

- Camera capture on the create wine form (rear camera via `capture="environment"`)
- AVIF encoding on main thread with @jsquash/avif (quality 50, max 1200px)
- Photo displayed on wine detail view
- Photo stored as ArrayBuffer in IndexedDB, cleaned up on wine deletion

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
