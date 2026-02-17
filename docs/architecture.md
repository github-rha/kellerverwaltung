# Architecture — Kellerverwaltung

## System boundaries

```
  ┌──────────────────────────────────────────────────────────┐
  │  User's iPhone                                           │
  │                                                          │
  │  ┌────────────────────────────────────────────────────┐  │
  │  │  Safari / PWA shell                                │  │
  │  │                                                    │  │
  │  │  ┌──────────────────────────────────────────────┐  │  │
  │  │  │  Kellerverwaltung PWA                        │  │  │
  │  │  │                                              │  │  │
  │  │  │  UI layer ←→ Data layer ←→ Storage layer     │  │  │
  │  │  └──────────────────┬───────────────────────────┘  │  │
  │  │                     │ uses                         │  │
  │  │       ┌─────────────┴──────────────┐               │  │
  │  │       │  Browser-provided storage  │               │  │
  │  │       │  • IndexedDB (data+photos) │               │  │
  │  │       │  • Service Worker (app     │               │  │
  │  │       │    shell offline cache)    │               │  │
  │  │       └─────────────┬──────────────┘               │  │
  │  └─────────────────────┼──────────────────────────────┘  │
  └────────────────────────┼─────────────────────────────────┘
                           │
                           │ HTTPS + PAT (manual sync only)
                           ▼
                ┌──────────────────────┐
                │  GitHub (private repo)│
                │                      │
                │  data/cellar.json    │
                │  data/photos/*.avif  │
                └──────────────────────┘
```

**Trust boundary**: everything inside the PWA is trusted. The only
external system is the private GitHub repo, accessed over HTTPS with a
Personal Access Token (PAT) stored locally on the device.

---

## Components

### UI layer

Renders views, handles touch input, and dispatches user intents to the
data layer.

```
┌──────────────────────────────────────────────────────────────┐
│                          UI layer                             │
│                                                              │
│  ┌──────────────────────────┐     ┌────────────────────────┐ │
│  │  Dashboard               │     │  Wine detail           │ │
│  │  • total bottle count    │ tap │                        │ │
│  │  • wine list             │wine │  View mode (default):  │ │
│  │  • Filter (type,         │────>│  • all fields (read)   │ │
│  │    producer) button      │     │  • photo (if present)  │ │
│  │  • Sort (vintage,        │<────│  • +1 / -1             │ │
│  │    date added) button    │back │  • edit button         │ │
│  │                          │     │  • "more from this     │ │
│  │                          │     │    producer" → back    │ │
│  │                          │     │                        │ │
│  │                          │     │  Edit mode:            │ │
│  │                          │     │  • fields editable     │ │
│  │                          │     │  • save / cancel       │ │
│  │                          │     └────────────────────────┘ │
│  │  • Add wine button ──────│──┐                             │
│  │                          │  │  ┌────────────────────────┐ │
│  │  • sync controls         │  └─>│  Add wine              │ │
│  │    (or "set up sync"     │ new │  • all fields           │ │
│  │     if unconfigured)     │<────│  • photo capture        │ │
│  └────────────┬─────────────┘save │  • save / cancel        │ │
│               │                   └────────────────────────┘ │
│               │                   ┌────────────────────────┐ │
│               │  gear icon        │  Settings              │ │
│               └──────────────────>│  • repo (owner/repo)   │ │
│                                   │  • PAT                 │ │
│                                   └────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

Key views:

| View            | Responsibility                               |
|-----------------|----------------------------------------------|
| Dashboard       | Total bottle count, scrollable wine list. Add wine button. Filter button (by type: red/white/sparkling/dessert, or by producer). Sort button (by vintage or date added). Sync controls (manual push/pull, status indicator) — or a "set up sync" link to Settings if no PAT is configured. |
| Wine detail     | **View mode** (default): all fields read-only, +1/-1 buttons, photo (if present), edit button, "more from this producer" → dashboard filtered. **Edit mode**: fields become editable, save/cancel. |
| Add wine        | Create form with all fields + optional photo capture. Photo is encoded to AVIF and saved after wine creation. |
| Settings        | Repo (owner/repo) and PAT input. One-time setup, accessed via gear icon on dashboard. |

### Data layer

Manages in-memory state, validates changes, and mediates between UI and
storage.

```
┌─────────────────────────────────────────────┐
│                 Data layer                   │
│                                             │
│  ┌────────────┐  ┌───────────────────────┐  │
│  │  Wine       │  │  Sync engine          │  │
│  │  Store      │  │                       │  │
│  │  (CRUD +    │  │  push()  pull()       │  │
│  │   counts)   │  │  hasUnsyncedChanges   │  │
│  └──────┬──────┘  └──────────┬────────────┘  │
│         │                    │               │
│         ▼                    ▼               │
│  ┌──────────────────────────────────────┐    │
│  │      Schema validation               │    │
│  │      (cellar.schema.json v1)         │    │
│  └──────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

- **Wine store**: CRUD on `WineEntry` objects — create, update fields,
  adjust `bottles` count, delete.
- **Sync engine**: implements the push/pull/force-pull protocol described
  in `analysis/sync-notes.md`.
- **Schema validation**: ensures `cellar.json` conforms to
  `schema/cellar.schema.json` before persisting.

### Storage layer

Persists data locally and provides the interface for remote sync.

```
┌─────────────────────────────────────────────────────────┐
│                    Storage layer                         │
│                                                         │
│  ┌─────────────────────┐   ┌─────────────────────────┐  │
│  │  Local persistence   │   │  Remote persistence     │  │
│  │                      │   │                          │  │
│  │  IndexedDB            │   │  GitHub Contents API    │  │
│  │  • cellar.json blob  │   │  • data/cellar.json     │  │
│  │  • photo blobs       │   │  • data/photos/*.avif   │  │
│  └─────────────────────┘   └─────────────────────────┘  │
│                                                         │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  Service Worker                                     │ │
│  │  • Caches app shell for offline launch              │ │
│  │  • Does NOT cache data (data lives in IndexedDB)    │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

> **Future option**: if photo storage outgrows IndexedDB performance,
> the Origin Private File System (OPFS) could replace it for binary
> blobs. OPFS offers faster synchronous access from Web Workers but
> iOS Safari support needs verification at that point.

---

## Data model

Defined by `schema/cellar.schema.json` (schema version 1):

```
cellar.json
├── schemaVersion: 1
└── wines: WineEntry[]
        ├── id          string (UUID)
        ├── type        "red" | "white" | "sparkling" | "dessert"
        ├── producer    string
        ├── producerKey string (slug, for grouping)
        ├── name        string
        ├── vintage     integer (1900–3000) | "NV"
        ├── bottles     integer (≥ 0)
        ├── notes       string
        ├── photoRef    string ("photos/<id>.avif")
        └── addedAt     string (ISO 8601 datetime, for sort-by-date)
```

Photos are stored as separate AVIF files, referenced by `photoRef`.
They are committed as regular git blobs (no Git LFS).

---

## Data flows

### 1. Add / edit a wine

```
 User                UI               Data layer          Local storage
  │                   │                    │                    │
  │  fill form        │                    │                    │
  │──────────────────>│                    │                    │
  │                   │  createWine(entry) │                    │
  │                   │───────────────────>│                    │
  │                   │                    │  validate(schema)  │
  │                   │                    │───────┐            │
  │                   │                    │<──────┘            │
  │                   │                    │  write(cellar.json)│
  │                   │                    │───────────────────>│
  │                   │                    │  hasUnsynced=true  │
  │                   │                    │───────┐            │
  │                   │  updated state     │<──────┘            │
  │  confirm          │<───────────────────│                    │
  │<──────────────────│                    │                    │
```

### 2. Adjust bottle count (+1 / -1)

```
 User                UI               Data layer          Local storage
  │                   │                    │                    │
  │  tap +1           │                    │                    │
  │──────────────────>│                    │                    │
  │                   │  adjustCount(id,+1)│                    │
  │                   │───────────────────>│                    │
  │                   │                    │  bottles += 1      │
  │                   │                    │  write(cellar.json)│
  │                   │                    │───────────────────>│
  │                   │  new count         │                    │
  │  see updated count│<───────────────────│                    │
  │<──────────────────│                    │                    │
```

### 3. Push to GitHub

```
 User         UI          Sync engine       Local storage       GitHub
  │            │               │                  │                │
  │  tap push  │               │                  │                │
  │───────────>│               │                  │                │
  │            │  push()       │                  │                │
  │            │──────────────>│                  │                │
  │            │               │  read photos     │                │
  │            │               │─────────────────>│                │
  │            │               │  read cellar.json│                │
  │            │               │─────────────────>│                │
  │            │               │                  │                │
  │            │               │  PUT photos/*.avif (new/changed) │
  │            │               │────────────────────────────────->│
  │            │               │  PUT data/cellar.json            │
  │            │               │────────────────────────────────->│
  │            │               │                          200 OK  │
  │            │               │<─────────────────────────────────│
  │            │               │  hasUnsynced=false               │
  │            │               │──────┐                           │
  │            │  sync complete│<─────┘                           │
  │  confirm   │<──────────────│                                  │
  │<───────────│               │                                  │
```

### 4. Pull from GitHub

```
 User         UI          Sync engine       Local storage       GitHub
  │            │               │                  │                │
  │  tap pull  │               │                  │                │
  │───────────>│               │                  │                │
  │            │  pull()       │                  │                │
  │            │──────────────>│                  │                │
  │            │               │  check hasUnsyncedChanges        │
  │            │               │──────┐                           │
  │            │               │<─────┘                           │
  │            │               │                                  │
  │            │               │── if unsynced: BLOCK ──>│        │
  │            │               │   (user must push first │        │
  │            │               │    or force-pull)       │        │
  │            │               │                         │        │
  │            │               │── if clean: ────────────┘        │
  │            │               │  GET data/cellar.json            │
  │            │               │────────────────────────────────->│
  │            │               │  GET data/photos/*.avif          │
  │            │               │────────────────────────────────->│
  │            │               │                    data + photos │
  │            │               │<─────────────────────────────────│
  │            │               │  overwrite local  │              │
  │            │               │─────────────────->│              │
  │            │  sync complete│                   │              │
  │  confirm   │<──────────────│                   │              │
  │<───────────│               │                   │              │
```

### 5. Capture photo

```
 User                UI               Data layer          Local storage
  │                   │                    │                    │
  │  tap camera       │                    │                    │
  │──────────────────>│                    │                    │
  │                   │  <input capture>   │                    │
  │  take photo       │                    │                    │
  │──────────────────>│                    │                    │
  │                   │  convert to AVIF   │                    │
  │                   │───────┐            │                    │
  │                   │<──────┘            │                    │
  │                   │  savePhoto(id,blob)│                    │
  │                   │───────────────────>│                    │
  │                   │                    │  write photos/id   │
  │                   │                    │───────────────────>│
  │                   │                    │  update photoRef   │
  │                   │                    │  hasUnsynced=true  │
  │                   │  photo saved       │                    │
  │  see thumbnail    │<───────────────────│                    │
  │<──────────────────│                    │                    │
```

---

## Offline behavior

```
                  ┌──────────────────────────┐
                  │     App launch           │
                  └────────────┬─────────────┘
                               │
                  ┌────────────▼─────────────┐
                  │  Service Worker serves   │
                  │  cached app shell        │
                  └────────────┬─────────────┘
                               │
                  ┌────────────▼─────────────┐
                  │  Data layer loads from   │
                  │  IndexedDB               │
                  └────────────┬─────────────┘
                               │
                  ┌────────────▼─────────────┐
              ┌───│  Network available?      │───┐
              │   └──────────────────────────┘   │
             yes                                  no
              │                                   │
  ┌───────────▼──────────┐          ┌─────────────▼──────────┐
  │  Sync controls       │          │  Sync controls         │
  │  enabled             │          │  disabled / greyed out │
  │  (push/pull allowed) │          │  (local edits still OK)│
  └──────────────────────┘          └────────────────────────┘
```

All reads and writes work against local storage. The network is only
needed for manual sync. The app never blocks on connectivity.

---

## Design patterns

### Why NOT event sourcing, CQRS, or hexagonal architecture

This is a single-user, single-device app with a small dataset (hundreds
of wines, not millions of rows). The architecture is deliberately simple:

| Pattern              | Verdict    | Rationale                                    |
|----------------------|------------|----------------------------------------------|
| Event sourcing       | Not used   | No audit trail or undo requirement. The data set is small enough to overwrite the full JSON blob on each save. Event replay adds complexity with no payoff here. |
| CQRS                 | Not used   | Read and write models are identical — a flat list of wines. Separating them would be pure overhead. |
| Hexagonal / ports+adapters | Partial | The storage layer does use a port/adapter style (local vs. remote persistence behind a common interface), but full hexagonal wiring is over-engineering for one entity type. |

### Patterns actually used

**Document store with snapshot persistence** — the entire cellar is a
single JSON document loaded into memory, mutated, and written back
atomically. This keeps code trivial and sidesteps partial-update bugs.

```
  ┌─────────────┐     read/write      ┌──────────────┐
  │  In-memory   │◄───────────────────►│  IndexedDB   │
  │  cellar.json │     (full doc)      │  (blob key)  │
  └──────┬───────┘                     └──────────────┘
         │
         │  on mutate: validate → save → notify UI
         ▼
  ┌─────────────┐
  │  Reactive UI │
  │  (re-render) │
  └─────────────┘
```

**Optimistic UI** — count adjustments and edits update the screen
immediately from the in-memory document. The persist-to-IndexedDB step
is async but the user never waits for it.

**Manual sync with pessimistic conflict avoidance** — rather than
merging concurrent changes, the sync engine blocks pull when local
changes exist and forces the user to choose (push or discard). This is
simple, correct, and appropriate for a single-device app.

---

## Stack decisions

| Layer         | Choice             | Rationale                                                  |
|---------------|--------------------|------------------------------------------------------------|
| Language      | **TypeScript**     | Type safety for the data model, broad PWA tooling support, team familiarity. |
| Framework     | **SvelteKit 2 + Svelte 5** | Tiny runtime (~5 kB), fast startup on mobile, built-in static adapter for GitHub Pages deployment. No virtual DOM overhead. |
| Styling       | **Tailwind CSS 4** | Utility-first keeps the CSS bundle small, avoids naming debates, works well with Svelte component scoping. |
| Build tool    | **Vite**           | Fast HMR during dev, tree-shaking, native PWA plugin (`@vite-pwa/sveltekit`). |
| Local storage | **IndexedDB** (via `idb-keyval`) | Async, no size cap issues for a few hundred KB of JSON + photo blobs. Works in Safari PWA context. OPFS as a future option for larger photo sets. |
| Photo format  | **AVIF**           | Best compression for label photos; keeps git repo small. iOS 26.2+ Safari supports AVIF natively. |
| Schema        | **JSON Schema (2020-12)** | Machine-readable contract for `cellar.json`; enables validation in the app and in CI. |
| Remote sync   | **GitHub Contents API** | The repo already exists; no extra infra. PAT auth is simple. Manual push/pull avoids the need for a server. |
| Hosting       | **GitHub Pages**   | Free, zero-ops static hosting. SvelteKit static adapter outputs a directory that Pages serves directly. |
| CI            | **GitHub Actions** | Co-located with the repo, free tier is sufficient. Runs schema validation, tests, and deploys on push to `main`. |

### What was considered and rejected

| Alternative         | Why rejected                                          |
|---------------------|-------------------------------------------------------|
| React / Next.js     | Larger runtime, SSR not needed for offline PWA.       |
| Automerge CRDT      | Multi-device conflict-free sync is a non-goal for v0. Adds WASM dependency and complexity. |
| Cloudflare R2 sync  | Extra infrastructure for a single-user app with an existing GitHub repo. |
| SQLite / wa-sqlite  | Overkill for one entity type; JSON blob is simpler.   |
| Native Swift app    | Requires App Store; PWA meets the distribution goal.  |

---

## Testing strategy

### Test pyramid

```
         ╱  ╲
        ╱ E2E╲         ~5 tests
       ╱──────╲        Safari PWA smoke tests
      ╱ Integr. ╲      ~15 tests
     ╱────────────╲     Store ↔ IndexedDB, sync protocol
    ╱    Unit      ╲    ~40 tests
   ╱────────────────╲   Pure functions, schema validation
```

### Unit tests (~70% of test count)

- **What**: pure functions with no browser APIs — schema validation,
  `producerKey` derivation, count adjustment logic, JSON
  serialization/deserialization, data transformations.
- **Runner**: Vitest (ships with Vite, fast, TypeScript-native).
- **Coverage target**: 90%+ on data layer logic.

### Integration tests (~25% of test count)

- **What**: data layer interacting with real (in-memory) IndexedDB via
  `fake-indexeddb`; sync engine exercised against mocked GitHub API
  responses; full push/pull/force-pull protocol paths.
- **Runner**: Vitest with `jsdom` or `happy-dom` environment.
- **Coverage target**: all sync state transitions (clean push, blocked
  pull, force pull).

### E2E tests (~5% of test count)

- **What**: critical user flows in a real browser — add wine → see
  count update → push succeeds; pull overwrites local; offline launch
  shows cached data.
- **Runner**: Playwright (WebKit/Safari engine available).
- **Scope**: kept minimal — these are slow and brittle. Only test what
  lower layers cannot.

### CI pipeline

```
  push / PR to main
        │
        ▼
  ┌─────────────────────────────────────────────┐
  │  GitHub Actions                              │
  │                                              │
  │  ┌─────────────┐  ┌──────────────────────┐  │
  │  │ Lint + types │  │ Schema validation    │  │
  │  │ (parallel)   │  │ (ajv against         │  │
  │  │              │  │  examples/*.json)    │  │
  │  └──────┬───────┘  └──────────┬───────────┘  │
  │         │                     │              │
  │         └──────────┬──────────┘              │
  │                    ▼                         │
  │         ┌──────────────────┐                 │
  │         │ Unit + integration│                 │
  │         │ tests (Vitest)    │                 │
  │         └────────┬─────────┘                 │
  │                  ▼                           │
  │         ┌──────────────────┐                 │
  │         │ Build (Vite)     │                 │
  │         └────────┬─────────┘                 │
  │                  ▼                           │
  │         ┌──────────────────┐                 │
  │         │ E2E (Playwright) │                 │
  │         │ (WebKit only)    │                 │
  │         └────────┬─────────┘                 │
  │                  ▼                           │
  │         ┌──────────────────┐                 │
  │         │ Deploy to Pages  │  (main only)    │
  │         └──────────────────┘                 │
  └─────────────────────────────────────────────┘
```

- Lint, type-check, and schema validation run in parallel.
- Tests gate the build; E2E gates deploy.
- Deploy step only runs on `main`, not on PRs.

---

## Security model

### Authentication & authorization

```
  ┌───────────┐        ┌──────────────────┐        ┌──────────────┐
  │  iPhone    │        │  GitHub Pages    │        │  GitHub API  │
  │  (user)    │        │  (static host)   │        │  (data sync) │
  └─────┬──────┘        └────────┬─────────┘        └──────┬───────┘
        │                        │                         │
        │  HTTPS (public)        │                         │
        │───────────────────────>│                         │
        │  app shell (no auth)   │                         │
        │<───────────────────────│                         │
        │                                                  │
        │  HTTPS + PAT (bearer token)                      │
        │─────────────────────────────────────────────────>│
        │  read/write data/cellar.json, data/photos/*      │
        │<─────────────────────────────────────────────────│
        │                                                  │
```

- **App shell**: served from GitHub Pages, public, no authentication.
  The app contains no user data — it is a static SPA.
- **Data sync**: authenticated via a GitHub Personal Access Token (PAT)
  with `repo` scope on the private data repository.
- **Authorization**: the PAT implicitly grants full read/write to the
  private repo. There are no roles or permissions beyond "owner has
  the token".
- **No server-side sessions**: the app has no backend. There is nothing
  to log into.

### PAT storage

The PAT is stored in the browser's origin-scoped storage (IndexedDB or
localStorage). It never leaves the device except in HTTPS requests to
`api.github.com`.

### Data classification

| Data                | Classification | Storage location       | Notes                                  |
|---------------------|----------------|------------------------|----------------------------------------|
| Wine entries (JSON) | Personal       | IndexedDB + GitHub     | Not sensitive, but private.            |
| Photos (AVIF)       | Personal       | IndexedDB + GitHub     | Label photos only, no PII.            |
| GitHub PAT          | Secret         | IndexedDB/localStorage | Grants repo access; treat as password. |
| App shell (JS/CSS)  | Public         | GitHub Pages CDN       | Open source / not secret.              |

### Threat model

| Threat                              | Likelihood | Impact   | Mitigation                                                    |
|-------------------------------------|------------|----------|---------------------------------------------------------------|
| **PAT leaked in client-side code**  | Low        | High     | PAT is user-entered at runtime, never bundled in the build. CI does not handle PATs. |
| **XSS stealing PAT**                | Low        | High     | No user-generated HTML rendered as raw markup. Svelte auto-escapes by default. CSP headers on GitHub Pages. |
| **Device theft → data access**      | Medium     | Low      | Data is wine inventory, not high-value. iOS device passcode / Face ID protects Safari storage. |
| **MITM on sync**                    | Very low   | Medium   | All GitHub API traffic is HTTPS/TLS. HSTS enforced by GitHub. |
| **GitHub repo compromise**          | Very low   | Medium   | Repo is private. PAT has minimal scope. Git history enables recovery of overwritten data. |
| **IndexedDB data loss (Safari bug)**| Low        | Medium   | Mitigated by regular push to GitHub. Force-pull restores full state. |
| **Malicious Service Worker update** | Very low   | High     | App is deployed from a controlled repo. GitHub Pages serves over HTTPS (SW requirement). Pin dependency versions; review diffs. |

### What is explicitly out of scope

- Encryption at rest for IndexedDB (relies on iOS device encryption).
- End-to-end encryption of data in the GitHub repo (the repo is private;
  contents are wine inventory, not secrets).
- Rate limiting or abuse prevention (single user, no public API).
- GDPR / data subject requests (single user is the data controller and
  subject).
