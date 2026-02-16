# Vision — Kellerverwaltung

## Overview
Kellerverwaltung is a no-nonsense tool for managing a personal wine cellar.

## Target user
A single owner of a personal wine cellar who wants a fast, private, no-nonsense way to track what they have (counts per wine) on an iPhone without using the App Store.

## Core jobs-to-be-done
1. **Know what I have**: see total bottles and per-wine counts at a glance.
2. **Add bottles quickly**: create or update a wine entry with minimal typing (photo helps confirm identity).
3. **Adjust counts effortlessly**: increment/decrement bottles when buying or drinking.
4. **Find related bottles**: quickly see “other wines from this producer”.
5. **Back up / restore**: export and re-import cellar data reliably (v0), with a path to GitHub sync later.

## UX constraints
- **Platform**: iPhone PWA (Safari → “Add to Home Screen”), targeting modern iOS (26.2+).
- **Offline-first**: app must work without network; local data is the source of truth.
- **Performance**:
  - App starts fast and remains responsive for typical cellar sizes.
  - Common actions (search, +1/-1, save) feel instantaneous.
- **Accessibility**:
  - Works with Dynamic Type and VoiceOver for core flows.
  - Tap targets suitable for one-handed use.
- **Data capture constraints**:
  - One photo per wine (regulatory label with alcohol %), stored as AVIF.

## Success metrics
- **Inventory KPI present**: total bottles shown on the dashboard (always).
- **Speed to add**: add a new wine entry in under ~30 seconds in normal use.
- **Edit friction**: adjust bottle count (+1/-1) in under ~2 seconds.
- **Reliability**:
  - Local data persists across restarts/updates (no unexpected loss).
  - Export → Import roundtrip restores 100% of wine entries (v0; photos may be excluded).
- **Adoption**: primary user uses it during regular cellar updates and yearly checks.

## Non-goals
- Social features, community ratings, tasting notes, rankings.
- Full wine metadata cataloging (keep fields minimal).
- Cellar location tracking (racks/bins).
- Multi-user or collaborative workflows.
- Automatic background sync (manual only; GitHub sync can come later).
- Complex ML/self-trained recognition in v0 (photo is for confirmation; scanning/OCR may be explored later).
