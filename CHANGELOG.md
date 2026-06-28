# Changelog

## v1.0.1 — Security hardening (2026-06-28)

### Security

- Content-Security-Policy added; `connect-src` restricted to `api.github.com` and `api.anthropic.com` to limit exfiltration of the stored GitHub token and Anthropic API key
- Settings now recommends a fine-grained GitHub token scoped to the data repository (`Contents` read/write) instead of a classic `repo`-scope token

### Changed

- Sommelier model upgraded to `claude-opus-4-8`

### Fixed

- Remote photos are validated as AVIF before being stored on pull
- CI workflow no longer references the removed `worktree-ocr-fix` branch

## v1.0.0 — Sommelier tool-use + header tap feedback (2026-05-10)

### Changed

- Sommelier uses Claude's `tool_use` instead of free-text JSON output, eliminating parse errors from apostrophes / smart quotes / mixed delimiters in producer or wine names
- Dropped the "at least 2 of each type" instruction from the sommelier prompt (Querschläger requirement kept)

### Added

- Pressed-state `border-wine` ring on the Add wine and Settings header buttons, matching the type-filter feedback pattern

## v0.9.10 — Session-persistent filters + Sommelier (2026-03-28)

### Added

- Filters persist across navigation within a session (e.g. detail → back)
- "Sommelier" button: describe a dish in plain text, get AI wine-pairing suggestions from the cellar (up to 10, ordered by best match)
- Recommendations include "Querschläger" (unconventional pick) and "Drink now" (ideal drinking window) labels
- Uses the existing Claude API key; entire cellar sent as context

## v0.9.9 — Review fixes + quality label (2026-03-03)

### Fixed

- `sortWines()` now has a default return (no longer returns undefined for an unexpected sort value)
- `runClaudeOcr` wraps `JSON.parse` in try/catch (no uncaught exception on unexpected Claude output)

### Removed

- Dead `OcrResult.words` field

### Added

- haeusler-wein.ch quality label in Settings

## v0.9.8 — Rosé wine type (2026-03-03)

### Added

- `rose` as a fifth wine type throughout (schema, types, form, filter bar, `bottle-rose.png`)

### Changed

- Shrunk bottle filter buttons so all five types fit on one line on a standard iPhone

## v0.9.7 — Filter row reorder + cycling sort (2026-03-02)

### Changed

- Reordered filter row: filter dropdown → bottle images → sort button
- Replaced the sort dropdown with a single button that cycles vintage ↓ → vintage ↑ → newest

## v0.9.6 — Onboarding + filter fix (2026-03-01)

### Added

- First-run onboarding overlay (shown once, dismissed with "Get started")
- "Finito" label for sold-out wines

### Fixed

- Filter dropdown no longer runs off-screen (Filter + Sort moved left of the bottle images)

## v0.9.5 — Filter UX improvements (2026-03-01)

### Changed

- Filter button shows a funnel icon instead of "Filter" text
- Dropped the "Oldest" sort option (kept Vintage ↓, Vintage ↑, Newest)
- Reordered filter panel: Bottles, then Producer, Country
- Producer and Country filters became autocomplete text inputs

## v0.9.4 — Single filter row (2026-03-01)

### Changed

- Merged the bottle-type image buttons and the Filter/Sort pills onto one row

## v0.9.3 — Sync UX + inventory path (2026-03-01)

### Changed

- Replaced dashboard Push/Pull with a single push-only "Sync" button
- Sync blocked when the local cellar has fewer than 10 wines (guards against accidental overwrite)
- Moved pull/restore to Settings as "Restore from GitHub"
- Inventory files stored as `inventory/YYYY-MM-DD-cellar-list.txt`

## v0.9.2 — Import + export (2026-03-01)

### Changed

- Moved CSV import from the dashboard header into Settings

### Added

- One-tap "Export to GitHub" in Settings: pushes a print-ready `cellar-list.txt` (producer, name, vintage, bottles for in-stock wines)

## v0.9.1 — Bottle image filters + add button (2026-03-01)

### Changed

- Replaced the Red/White/Sparkling/Dessert text filter pills with `bottle-{type}.png` images
- Replaced the "+" add button with `bottle-plus.png`

## v0.9.0 — Visual redesign (2026-02-28)

### Changed

- New palette inspired by haeusler-wein.ch: brick-red accent `#A62A17`, warm-grey text `#575757`, subtle red-tinted borders
- PWA icon switched to the Turmfalke (kestrel) mark

## v0.8.0 — UI tweaks + bottle history (2026-02-28)

### Added

- Quick type filter pills (Red / White / Sparkling / Dessert) always visible on dashboard; removed from filter panel
- Bottle count filters: "Single bottle" and "0 bottles" toggles in the filter panel
- Active bottle filter shown as a removable pill
- Bottle history: every +/− tap records a timestamped entry (delta + count after change)
- History timeline on wine detail view (most-recent-first, e.g. `+1 · 28 Feb 2026`)

### Changed

- Default sort changed from "newest added" to "vintage descending"
- 0-bottle wines hidden by default (new `in-stock` bottle filter)

## v0.7.0 — OCR pre-fill (2026-02-20)

### Added

- After taking a label photo, a crop UI lets the user select the label region before sending to OCR
- Crop UI: drag-to-resize selection box with "Crop & Read" and "Skip" actions
- Label sent to Claude API (claude-haiku-4-5-20251001) to pre-fill producer, name, vintage, and country
- Pre-fill does not overwrite fields the user has already typed into
- Anthropic API key field in Settings (stored in IndexedDB, sent only to api.anthropic.com)
- Images downscaled to ≤ 1568 px before sending to stay within API limits
- Error shown if API call fails (e.g. invalid key, network error)

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
