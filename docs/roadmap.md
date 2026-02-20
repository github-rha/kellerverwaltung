# Roadmap — Kellerverwaltung

## v0.1.0 — Core inventory tracking ✓

Add wines, browse them, adjust bottle counts. Data persists locally.
Installable PWA, works offline.

Plan: `docs/plan/v0.1.0-initial-version.md`

## v0.2.0 — Filter, sort, and producer grouping ✓

- Filter dashboard by wine type (red/white/sparkling/dessert)
- Filter dashboard by producer
- Sort by vintage or date added
- "More from this producer" button on wine detail

Plan: `docs/plan/v0.2.0-filter-sort-producer-grouping.md`

## v0.3.0 — Photo capture ✓

- Camera capture on the create wine form
- Capture label photo, resize to max 1200px, convert to AVIF, store in IndexedDB
- Display photo on wine detail view
- Photo cleaned up when wine is deleted

Plan: `docs/plan/v0.3.0-photo-capture.md`

## v0.4.0 — GitHub sync ✓

- Settings view (repo, PAT)
- Manual push to private GitHub repo
- Manual pull from GitHub repo
- Force-pull with confirmation
- Sync status indicator on dashboard
- "Set up sync" prompt when unconfigured

Plan: `docs/plan/v0.4.0-github-sync.md`

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
