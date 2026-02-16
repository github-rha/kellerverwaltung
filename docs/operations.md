# Operations — Kellerverwaltung

## Deployment

```
  Developer pushes to main
         │
         ▼
  ┌──────────────────────────────┐
  │  GitHub Actions CI           │
  │                              │
  │  1. npm ci                   │
  │  2. validate schema          │
  │  3. run tests                │
  │  4. npm run build            │
  │  5. deploy to GitHub Pages   │
  └──────────────────────────────┘
         │
         ▼
  ┌──────────────────────────────┐
  │  GitHub Pages                │
  │  (static files served via    │
  │   CDN, HTTPS by default)     │
  └──────────────────────────────┘
         │
         ▼
  ┌──────────────────────────────┐
  │  User's iPhone               │
  │  Service Worker updates      │
  │  cached app shell on next    │
  │  visit (or via manual        │
  │  refresh)                    │
  └──────────────────────────────┘
```

- **Zero backend** — the app is static files only. There is no server
  process, database, or container to operate.
- **Deployment is a git push** — GitHub Actions builds and deploys
  automatically.

## Scaling

Not applicable in the traditional sense. This is a single-user PWA:

- All computation happens on the user's device.
- GitHub Pages CDN handles static asset delivery.
- The data set (a few hundred wines) fits comfortably in memory and
  IndexedDB.

## Monitoring

| What                      | How                                         |
|---------------------------|---------------------------------------------|
| App availability          | GitHub Pages status (status.github.com)     |
| Build / deploy failures   | GitHub Actions notifications (email)        |
| Client-side errors        | Browser console (no telemetry — privacy)    |
| Sync failures             | In-app status indicator after push/pull     |
| Data integrity            | Schema validation on every save; CI runs schema check on cellar.json examples |

No external monitoring service — the app is private and has one user.
If something breaks, the user sees it immediately.

## Recovery

| Scenario                  | Recovery path                               |
|---------------------------|---------------------------------------------|
| Lost/broken phone         | Pull `cellar.json` + photos from GitHub repo to new device. |
| Corrupted IndexedDB       | Force-pull from GitHub overwrites local state. |
| Bad deploy                | Revert commit on `main`; Pages redeploys. Service Worker picks up fix on next visit. |
| Accidentally deleted wine | Data is in git history — `git log` / `git checkout` the previous `cellar.json`. |
| GitHub outage             | App works fully offline. Sync resumes when GitHub is back. |

The GitHub repo is the disaster recovery mechanism. As long as the user
pushes regularly, all data (including photos) is recoverable from git
history.
