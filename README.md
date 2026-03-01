# Kellerverwaltung

Personal wine cellar tracker. iPhone PWA — install via Safari "Add to Home Screen", works mostly offline.

## Features

- Track bottle counts per wine
- Add wines with type, producer, name, vintage, country, notes, and a label photo
- OCR pre-fill: photograph a label and let the Claude API read producer, name, vintage, and country
- Filter by wine type, producer, or country; sort by vintage or date added
- Sync to a private GitHub repository with a single Sync tap
- Export a dated plain-text inventory list to the repository (`inventory/YYYY-MM-DD-cellar-list.txt`)
- Import wines from CSV

## Installing on iPhone

1. Open the app URL in Safari
2. Tap the Share button → "Add to Home Screen"
3. The app works mostly offline after install

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

### Syncing

- **Sync** (dashboard header) — pushes your local cellar (wines + photos) to GitHub. Blocked when offline or when the local cellar has fewer than 10 wines (safety guard against accidental overwrites).
- **Restore from GitHub** (Settings) — downloads from GitHub and overwrites all local data. Always requires confirmation.

The unsynced dot (●) next to the Sync button turns amber when you have local changes not yet pushed.

## Data format

All data is stored locally in IndexedDB. On GitHub, the repository contains:

```
data/
  cellar.json              ← wine inventory (JSON)
  photos/
    <id>.avif              ← label photos (one per wine, max 1200px, quality 50)
inventory/
  YYYY-MM-DD-cellar-list.txt  ← plain-text inventory snapshots (one per Inventory tap)
```
