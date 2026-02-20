# v0.2.0 — Filter, sort, and producer grouping

## Context

v0.1.0 shipped core CRUD. The dashboard currently shows a flat, unsorted wine list. As the cellar grows, the user needs to filter by wine type or producer, sort by vintage or date added, and navigate from a wine detail to other wines by the same producer. Per `docs/roadmap.md`:

- Filter dashboard by wine type (red/white/sparkling/dessert)
- Filter dashboard by producer
- Sort by vintage or date added
- "More from this producer" button on wine detail

## Approach

All filtering and sorting is done client-side on the in-memory wine array — no data layer changes needed. The state (active filter, active sort) lives in the dashboard page component as reactive `$state` variables.

### 1. Add filter/sort utility functions

**New file:** `app/src/lib/data/filter-sort.ts`

Pure functions, easy to unit test:
- `filterByType(wines, type | null)` — returns wines matching type, or all if null
- `filterByProducer(wines, producerKey | null)` — returns wines matching producerKey, or all if null
- `sortWines(wines, 'vintage-asc' | 'vintage-desc' | 'added-newest' | 'added-oldest')` — returns sorted copy

### 2. Add unit tests for filter/sort

**New file:** `app/src/lib/data/filter-sort.test.ts`

Tests:
- filterByType returns only matching wines
- filterByType with null returns all
- filterByProducer returns only matching wines
- sortWines by vintage ascending/descending
- sortWines by addedAt newest/oldest
- Combined filter + sort

### 3. Update dashboard with filter/sort controls

**Modify:** `app/src/routes/+page.svelte`

- Add state: `activeType`, `activeProducer`, `activeSort`
- Add a toolbar row below header with Filter and Sort buttons
- Filter button opens a dropdown/sheet with type chips (Red, White, Sparkling, Dessert) + producer list
- Sort button opens a dropdown with options (Vintage ↑, Vintage ↓, Newest, Oldest)
- Active filters shown as dismissible chips below toolbar
- `$derived` pipeline: `wines → filterByType → filterByProducer → sortWines → displayedWines`
- Update total count to reflect filtered results ("6 of 12 bottles" when filtered)

### 4. Update WineList to accept filtered wines

**Modify:** `app/src/lib/components/WineList.svelte`

- No structural changes — it already accepts a `wines` prop
- Add `filtered` boolean prop to distinguish empty states: "No wines match your filters" vs "No wines yet"

### 5. Add "More from this producer" to wine detail

**Modify:** `app/src/routes/wine/[id]/+page.svelte`

- Add a "More from this producer" link below the notes section
- Links back to dashboard with `?producer=<producerKey>` query param

### 6. Dashboard reads URL query params

**Modify:** `app/src/routes/+page.svelte`

- On mount, read `?type=` and `?producer=` from URL to pre-set filters
- This enables deep-linking to filtered views (from wine detail "more from producer")

## Files to create/modify

| File | Action |
|------|--------|
| `app/src/lib/data/filter-sort.ts` | Create |
| `app/src/lib/data/filter-sort.test.ts` | Create |
| `app/src/routes/+page.svelte` | Modify (filter/sort UI, query params) |
| `app/src/lib/components/WineList.svelte` | Modify (filtered empty state) |
| `app/src/routes/wine/[id]/+page.svelte` | Modify (add producer link) |
| `docs/roadmap.md` | Mark v0.2.0 complete |
| `CHANGELOG.md` | Add v0.2.0 entry |

## Verification

1. `npm test` — existing 23 tests still pass + new filter/sort tests pass
2. `npm run lint` — no lint errors
3. `npm run build` — builds successfully
4. Manual: add several wines of different types/producers/vintages, verify filter and sort work, verify "more from producer" navigates correctly
