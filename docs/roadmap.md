# Roadmap — Kellerverwaltung

## v0.1.0 — Core inventory tracking ✓

Add wines, browse them, adjust bottle counts. Data persists locally.
Installable PWA, works offline.

Plan: `docs/plan/20260216-initial-version.md`

## v0.2.0 — Filter, sort, and producer grouping ✓

- Filter dashboard by wine type (red/white/sparkling/dessert)
- Filter dashboard by producer
- Sort by vintage or date added
- "More from this producer" button on wine detail

Plan: `docs/plan/20260216-filter-sort-producer-grouping.md`

## v0.3.0 — Photo capture

- Camera button on wine detail (create and edit)
- Capture label photo, convert to AVIF, store in IndexedDB
- Display photo thumbnail on detail view

## v0.4.0 — GitHub sync

- Settings view (repo, PAT)
- Manual push to private GitHub repo
- Manual pull from GitHub repo
- Force-pull with confirmation
- Sync status indicator on dashboard
- "Set up sync" prompt when unconfigured

## v0.5.0 — CI pipeline

- GitHub Actions: lint, type-check, schema validation
- Unit + integration tests in CI
- E2E tests via Playwright (WebKit)
- Auto-deploy to GitHub Pages on push to main

## Future (unscheduled)

- OCR pre-fill via Tesseract.js (photo → extract producer, name, vintage)
- On-device ML model for label recognition
- Auto-push on visibility change
- JSON export/import for backup without GitHub
