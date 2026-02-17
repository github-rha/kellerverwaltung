# v0.3.0 — Photo capture

## Context

v0.2.0 shipped filter/sort/producer grouping. The data model already has a `photoRef` field (`photos/<id>.avif`, currently always empty) and IndexedDB is set up for blob storage. The roadmap calls for camera capture, AVIF conversion, and photo display on wine detail.

## Approach

Photos are captured via `<input type="file" capture="environment">` on the create wine form, resized on an `OffscreenCanvas` to max 1200px, and encoded to AVIF on the main thread using `@jsquash/avif` (Apache-2.0). The WASM module (~3.5MB) is loaded on demand via dynamic import. Photos are stored as `ArrayBuffer` in IndexedDB (Safari doesn't reliably store `Blob` objects).

> **Web Worker encoding was attempted** but abandoned: Vite's worker bundling doesn't resolve WASM URLs correctly for module workers served over the local network during dev, and Safari threw `null` errors. Main-thread encoding blocks the UI for 2-5 seconds but works reliably. A worker approach can be revisited if encoding time becomes a UX issue.

### 1. Photo persistence

**Modified:** `app/src/lib/data/persist.ts`

Added `savePhoto(wineId, blob)`, `loadPhoto(wineId)`, `deletePhoto(wineId)` using `idb-keyval` (import `del`). Key format: `photo:<wineId>`. Photos are converted to `ArrayBuffer` before storage and reconstructed as `Blob` on load.

**Modified:** `app/src/lib/data/store.ts`

Updated `deleteWine` to call `deletePhoto` when `photoRef` is non-empty.

**Created:** `app/src/lib/data/persist-photo.test.ts`

- Roundtrips photo data through IndexedDB
- Returns undefined when no photo exists
- Deletes photo from IndexedDB
- deleteWine also deletes associated photo blob

### 2. Image resize utility

**Created:** `app/src/lib/photo/resize.ts`

`resizeImage(file: File): Promise<ImageData>` — uses `createImageBitmap` + `OffscreenCanvas`, scales to max 1200px on the long side. Both APIs supported in Safari 17+ (target is iOS 26.2+).

### 3. AVIF encoding (main thread)

**Installed:** `@jsquash/avif` in `app/`

**Created:** `app/src/lib/photo/encode.ts`

`encodePhoto(file: File): Promise<Blob>` — calls `resizeImage`, dynamically imports `@jsquash/avif/encode.js`, initializes the WASM module with `locateFile` to resolve the correct URL, encodes at quality 50. The WASM module is initialized once and reused for subsequent encodes.

### 4. Photo capture in create form

**Modified:** `app/src/routes/wine/new/+page.svelte`

Added `<input type="file" accept="image/*" capture="environment">` wrapped in a styled label. On submit, if a photo was selected: encode → save to IndexedDB → update wine's `photoRef`. Shows "Encoding photo…" spinner during AVIF encoding.

### 5. Photo display on wine detail

**Modified:** `app/src/routes/wine/[id]/+page.svelte`

Loads photo from IndexedDB via `loadPhoto()` when `wine.photoRef` is set. Displays full-width image at the bottom of the detail view (after the "Added" date). Uses `$effect` with `untrack` to avoid reactive loops when creating/revoking object URLs.

### 6. Vite config

**Modified:** `app/vite.config.ts`

- Added `worker.format: 'es'` (for any future worker usage)
- Added `maximumFileSizeToCacheInBytes: 5MB` to workbox config (WASM files are ~3.5MB each, loaded on demand rather than precached)

## Files summary

| File | Action |
|------|--------|
| `app/src/lib/data/persist.ts` | Modified (add photo CRUD, ArrayBuffer storage) |
| `app/src/lib/data/store.ts` | Modified (deleteWine cleanup) |
| `app/src/lib/data/persist-photo.test.ts` | Created |
| `app/src/lib/photo/resize.ts` | Created |
| `app/src/lib/photo/encode.ts` | Created (main-thread encoding) |
| `app/src/routes/wine/new/+page.svelte` | Modified (add photo capture) |
| `app/src/routes/wine/[id]/+page.svelte` | Modified (display photo) |
| `app/vite.config.ts` | Modified (worker format, max file size) |
| `docs/plan/20260217-photo-capture.md` | Created (this plan) |
| `docs/roadmap.md` | Marked v0.3.0 complete |
| `CHANGELOG.md` | Added v0.3.0 entry |
| `app/package.json` | Bumped to 0.3.0 |

## Verification

1. `npm test` — existing 35 tests pass + 4 new persist-photo tests pass (39 total)
2. `npm run lint` — no lint errors
3. `npm run build` — builds successfully (WASM bundled)
4. Manual on iPhone: capture photo on create form, see encoding spinner, photo displays on detail view, persists across navigation, delete wine removes photo
