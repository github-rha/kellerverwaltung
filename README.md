# Kellerverwaltung

Personal wine cellar tracker. iPhone PWA — install via Safari "Add to Home Screen", works offline.

## Features

- Track bottle counts per wine
- Add wines with type, producer, name, vintage, notes, and a label photo
- Filter by wine type or producer, sort by vintage or date added
- Sync to a private GitHub repository (manual push/pull)

## Installing on iPhone

1. Open the app URL in Safari
2. Tap the Share button → "Add to Home Screen"
3. The app works offline after install

## GitHub sync setup

Sync backs up your cellar to a private GitHub repository. You need:

1. **A private GitHub repository** to store the data (can be empty, e.g. `you/wine-cellar-data`)
2. **A personal access token (PAT)** with write access to that repository

### Creating the PAT

Use a **fine-grained token** (recommended — minimal scope):

1. Go to GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens**
2. Click **Generate new token**
3. Set an expiration (e.g. 1 year)
4. Under **Repository access**, choose "Only select repositories" and select your data repo
5. Under **Permissions → Repository permissions**, set **Contents** to **Read and write**
6. Generate and copy the token

Alternatively, a **classic token** with the `repo` scope works, but grants full access to all your repositories — not recommended.

### Entering the settings

1. Open the app and tap the gear icon (top right of the dashboard)
2. Enter the repository as `owner/repo` (e.g. `you/wine-cellar-data`)
3. Paste the PAT
4. Tap Save

### Pushing and pulling

- **Push** — uploads your local cellar (wines + photos) to GitHub. Do this after making changes.
- **Pull** — downloads from GitHub and overwrites your local data. Blocked if you have unsynced local changes; push first.
- **Force-pull** — pulls and discards local changes. Shown when a normal pull is blocked.

Both buttons are disabled when offline.

## Data format

All data is stored locally in IndexedDB. On GitHub, the repository contains:

```
data/
  cellar.json       ← wine inventory (JSON)
  photos/
    <id>.avif       ← label photos (one per wine, max 1200px, quality 50)
```
