# Changelog

## v0.6.1 — Country field (2026-02-20)

### Added

- `country` field on every wine entry (string, defaults to `""`)
- Country picker (fixed list of ~47 wine-producing countries) on add and edit forms
- Country shown on wine detail view
- Filter by country on dashboard
- Optional `country` column in CSV import (absent or empty → `""`)
- Migration: existing entries without `country` silently upgraded to `""`

## v0.6.0 — CSV import (2026-02-20)

### Added

- Import wines from a CSV file (producer, name, type, vintage, bottles, notes)
- Preview before committing: summary line, per-row error list with row number and reason
- Skip or overwrite duplicates (matched by producer + name + vintage), global toggle
- Import button on dashboard header

## v0.5.0 — CI pipeline (2026-02-20)

### Added

- GitHub Actions workflow: lint, type-check, schema validation, unit/integration tests, build, E2E tests, deploy
- Auto-deploy to GitHub Pages (kellerverwaltung.haeusler-wein.ch) on push to main
- Playwright WebKit smoke tests (4 tests covering dashboard, add wine, count adjustment, edit)
- Schema validation script against example fixtures
- CNAME file for custom domain

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
