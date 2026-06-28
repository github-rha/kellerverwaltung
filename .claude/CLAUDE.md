# Kellerverwaltung

> Note: the rules in this directory are project-specific. They are layered on
> top of a shared rule set maintained privately and applied across multiple
> projects (general conventions for git, dependencies, secrets, verification,
> journaling, etc.). That central config is not part of this open-source repo,
> so some referenced conventions live outside it.

Personal wine cellar tracker for a single user. iPhone PWA (Safari "Add to Home Screen"), offline-first, no App Store.

## Core functionality
- Track bottle counts per wine; show totals on dashboard
- Add/edit wines quickly (minimal fields, one photo as AVIF)
- Increment/decrement counts in ≤2s
- Filter by producer
- Export/import JSON for backup (v0); GitHub sync later

## Technical constraints
- Offline-first PWA; local data is source of truth
- Target iOS 26.2+ Safari
- Accessible: Dynamic Type, VoiceOver, one-handed tap targets
- Fast startup, instant-feeling interactions

## Non-goals
- Social/community features, tasting notes, ratings
- Extensive wine metadata or cellar location tracking
- Multi-user, background sync, complex ML/OCR (v0)

## Reference docs
When implementing, consult the docs/ directory for architecture decisions, data model, sync behavior, and the current plan:
- `docs/architecture.md` — system boundaries, components, data flows, design patterns, stack decisions, security model
- `docs/vision.md` — target user, jobs-to-be-done, UX constraints, success metrics
- `docs/operations.md` — deployment, monitoring, recovery
- `docs/roadmap.md` — versioned milestones
- `docs/plan/` — current implementation plan with acceptance criteria
- `schema/cellar.schema.json` — canonical data model
