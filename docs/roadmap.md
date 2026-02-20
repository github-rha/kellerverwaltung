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

## v0.5.0 — CI pipeline ✓

- GitHub Actions: lint, type-check, schema validation
- Unit + integration tests in CI
- E2E tests via Playwright (WebKit)
- Auto-deploy to GitHub Pages on push to main

Plan: `docs/plan/v0.5.0-ci-pipeline.md`

## v0.6.0 — CSV import ✓

- Import wines from a CSV file (producer, name, type, vintage, bottles, notes)
- Preview import before committing (show count, flag validation errors per row)
- Skip or overwrite duplicates (matched by producer + name + vintage)

## v0.6.1 — Country field ✓

- Add `country` field to the wine data model and schema (string, defaults to `""`)
- Fixed list of wine-producing countries (not free text)
- Country picker on add-wine form and edit form
- Country shown on wine detail view
- Optional `country` column in CSV import (empty or absent → `""`)
- Filter by country on dashboard

## v0.7.0 — OCR pre-fill

- After taking a label photo on the add-wine form, run OCR to pre-fill producer,
  name, and vintage
- Store raw OCR output (text, per-word confidence and bounding boxes) + corrected
  field values in `data/ocr-training.json` in the GitHub repo, linked to the
  wine entry by ID — synced alongside cellar.json as training data for a future
  model

## Future (unscheduled)

- Onboarding: first-run screen when sync is unconfigured, with instructions for
  "Add to Home Screen" in Safari and how to set up GitHub sync (create private
  repo, generate fine-grained PAT, enter settings); shown once until dismissed
- On-device ML model for label recognition
- Auto-push on visibility change
- JSON export/import for backup without GitHub
