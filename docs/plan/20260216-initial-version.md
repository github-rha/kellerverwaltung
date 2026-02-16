# Plan: Initial Version

**Date**: 2026-02-16
**Goal**: A shippable PWA that lets the user add wines, browse them,
adjust bottle counts, and have data persist locally. Installable on
iPhone via "Add to Home Screen", works offline.

## What ships

- SvelteKit project in `app/` with PWA support (installable, offline)
- Dashboard showing total bottle count and scrollable wine list
- Add wine: manual form (type, producer, name, vintage, bottles, notes)
- Wine detail: view mode (read-only, +1/-1) and edit mode (save/cancel)
- Data persists in IndexedDB across restarts
- Schema validation on every write

## What does NOT ship (deferred)

- Photos / camera / AVIF
- GitHub sync (push/pull), settings view, PAT configuration
- Filter and sort buttons on dashboard
- "More from this producer"
- OCR / Tesseract.js
- CI pipeline / GitHub Actions
- E2E tests (Playwright setup deferred — manual iPhone testing for now)

## Steps

### 1. Scaffold SvelteKit project

Create `app/` with SvelteKit 2, Svelte 5, TypeScript, Tailwind CSS 4,
static adapter, and PWA plugin.

```
app/
├── src/
│   ├── lib/
│   │   ├── data/          # data layer
│   │   └── components/    # UI components
│   ├── routes/            # SvelteKit pages
│   └── app.css            # global styles + Tailwind
├── static/
│   └── manifest.json      # PWA manifest (or generated)
├── svelte.config.js
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

**Files created**:
- `app/package.json`
- `app/svelte.config.js`
- `app/vite.config.ts`
- `app/tsconfig.json`
- `app/src/app.css`
- `app/src/app.html`
- `app/src/routes/+layout.svelte`
- `app/src/routes/+layout.ts` (SSR off, prerender on)

### 2. Data layer

Wine store module: in-memory document, CRUD operations, IndexedDB
persistence via `idb-keyval`, schema validation via `ajv`.

Reuses the existing `schema/cellar.schema.json` (symlinked or imported
at build time).

**Files created**:
- `app/src/lib/data/types.ts` — `WineEntry`, `Cellar` TypeScript types
- `app/src/lib/data/store.ts` — `createWine()`, `updateWine()`,
  `deleteWine()`, `adjustCount()`, `getWine()`, `getAllWines()`,
  `getTotalBottles()`
- `app/src/lib/data/persist.ts` — `loadCellar()`, `saveCellar()` via
  idb-keyval
- `app/src/lib/data/validate.ts` — validate cellar JSON against schema
- `app/src/lib/data/producer-key.ts` — derive `producerKey` slug from
  producer name

### 3. Dashboard view

Route: `app/src/routes/+page.svelte`

- Total bottle count at top
- Scrollable list of wines (name, producer, vintage, bottle count)
- Add wine button (navigates to create form)
- Tap a wine row → navigate to wine detail

**Files created**:
- `app/src/routes/+page.svelte` — dashboard
- `app/src/lib/components/WineList.svelte` — wine list component
- `app/src/lib/components/WineRow.svelte` — single wine row

### 4. Wine detail view

Route: `app/src/routes/wine/[id]/+page.svelte`

- **View mode** (default): all fields read-only, +1/-1 buttons, edit
  button, back to dashboard
- **Edit mode**: fields become editable, save/cancel buttons

**Files created**:
- `app/src/routes/wine/[id]/+page.svelte` — detail/edit view

### 5. Create wine view

Route: `app/src/routes/wine/new/+page.svelte`

- Form with fields: type (dropdown), producer, name, vintage, bottles,
  notes
- `producerKey` derived automatically from producer
- `addedAt` set to current timestamp
- `id` generated as UUID
- Save → navigate to dashboard

**Files created**:
- `app/src/routes/wine/new/+page.svelte` — create form

### 6. PWA configuration

- Web app manifest (name, icons, theme color, display: standalone)
- Service Worker via `@vite-pwa/sveltekit` (cache app shell)
- Placeholder icon (can be replaced later)

**Files modified**:
- `app/vite.config.ts` — add PWA plugin config

### 7. Update project docs

- `docs/roadmap.md` — create with initial version marked as current,
  future increments listed
- `CHANGELOG.md` — create with v0.1.0 entry

**Files created**:
- `docs/roadmap.md`
- `CHANGELOG.md`

## Acceptance criteria

### Unit tests (Vitest)

**Data layer — `app/src/lib/data/`**:

| Test | What it verifies |
|------|------------------|
| `createWine` returns a wine with UUID, addedAt, and all fields set | Wine creation logic |
| `createWine` with missing required field throws validation error | Schema enforcement |
| `adjustCount(id, +1)` increments bottles by 1 | Count increment |
| `adjustCount(id, -1)` decrements bottles by 1 | Count decrement |
| `adjustCount` does not go below 0 | Floor at zero |
| `updateWine` changes fields and preserves others | Partial update |
| `deleteWine` removes entry from wines array | Deletion |
| `getAllWines` returns all wines | Read all |
| `getTotalBottles` sums all bottle counts | Aggregation |
| `producerKey("Weingut Keller")` returns `"weingut-keller"` | Slug derivation |
| `producerKey("Domaine de la Romanée-Conti")` handles diacritics | Unicode handling |
| `validate` rejects invalid type value | Enum validation |
| `validate` rejects vintage outside 1900–3000 range | Range validation |
| `validate` accepts "NV" as vintage | NV support |

**Persistence — `app/src/lib/data/persist.ts`**:

| Test | What it verifies |
|------|------------------|
| `saveCellar` then `loadCellar` roundtrips data | IndexedDB persistence |
| `loadCellar` returns empty cellar when no data exists | First launch |

### Integration tests (Vitest + jsdom)

| Test | What it verifies |
|------|------------------|
| Create wine → appears in `getAllWines()` → persists after `loadCellar()` | Full write path |
| Create wine → `adjustCount(+1)` → `getTotalBottles()` reflects change | Store + count |
| Create wine → `deleteWine()` → `getAllWines()` is empty | Delete path |

### Manual verification (iPhone)

> **Local testing setup**: run `npm run dev -- --host` from `app/`.
> This exposes the dev server on your LAN. Open
> `https://<your-mac-ip>:5173` in Safari on your iPhone (same Wi-Fi
> network). HTTPS is required for Service Worker / PWA install — Vite
> can serve over HTTPS with `--https` or you can use the production
> build via `npm run build && npm run preview -- --host`.

- [ ] App installs via "Add to Home Screen" in Safari
- [ ] App launches offline after install
- [ ] Add a wine → appears on dashboard
- [ ] Tap wine → see detail view → +1/-1 works
- [ ] Edit wine → save → changes reflected
- [ ] Kill and reopen app → data persists
- [ ] Total bottle count updates correctly

## Dependencies

```
# Production
svelte (5.x)
@sveltejs/kit (2.x)
@sveltejs/adapter-static
idb-keyval
ajv
ajv-formats

# Dev
vite
@vite-pwa/sveltekit
tailwindcss (4.x)
@tailwindcss/vite
typescript
vitest
fake-indexeddb
jsdom
```
