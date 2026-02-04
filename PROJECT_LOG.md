# Wine Cellar App – Project Log

## Decisions
- Distribution: PWA, install via Safari “Add to Home Screen” (no App Store)
- Platform: Web (mobile-first)
- Core model: one record per wine with a bottle count
- Producer stored as string + derived producerKey
- Vintage stored as year or "NV" (no nulls)
- One photo per wine: regulatory label (contains alcohol %)
- No cellar locations
- Canonical data format defined via JSON Schema in repo

## Non-goals
- Social features, ratings, tasting notes
- Full wine metadata

## Open questions
- Sync: GitHub
- Scanning: photo-only MVP vs basic OCR
