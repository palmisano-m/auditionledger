# Audition Ledger

A self-contained Progressive Web App for tracking opera audition singers across every session of the year. Data stays on the device; no account or backend required.

## Features

- **Audition sessions** — name, date, location, and a per-audition roles list
- **Singer records** — number, optional name, voice type, repertoire, notes, role (dropdown), score (1–10)
- **This Audition / All Auditions / By Role** views — By Role groups singers and sorts by score
- **Search** across every field; filter by voice type; sort by number, name, voice type, or score
- **Excel import** — load Name / Voice Type / Repertoire into the active audition (numbers auto-assigned)
- **Excel export** — one audition, or all auditions (combined sheet + one sheet per audition), including score
- **Auto-save** to browser storage on every change
- **Backup / restore** JSON files to the iPad Files app or iCloud Drive
- **Installable on iPad** — Add to Home Screen, opens full-screen offline after the first visit

Voice types: Soprano, Mezzo-Soprano, Countertenor, Tenor, Baritone, Bass.

## Deploy to GitHub Pages

1. Push this repository to GitHub.
2. Open **Settings → Pages**.
3. Under **Build and deployment**, set Source to **Deploy from a branch**.
4. Choose branch **main** (or `master`) and folder **/ (root)**.
5. Save. After a minute or two, the site is at:

   `https://<your-username>.github.io/auditionledger/`

   (Use your real GitHub username and repo name.)

All asset URLs are relative, so the app works at a project Pages path or a custom domain.

## Install on iPad

1. Open the Pages URL in **Safari** (online, once).
2. Tap the **Share** button → **Add to Home Screen**.
3. Confirm the name **Audition Ledger** and add it.
4. Open from the Home Screen icon — it launches full-screen without the Safari address bar.
5. After that first load, the app shell is cached and can be used **offline**.

## Local preview (optional)

Serve the folder over HTTP (service workers need a secure origin or localhost):

```bash
npx --yes serve .
```

Then open the URL shown in the terminal.

Opening `index.html` via `file://` works for basic editing on desktop but will not register the service worker or behave like an installed iPad app.

## Backup and restore

- **Save to Files** (Actions menu) downloads `audition-ledger-backup-YYYY-MM-DD.json`. On iPad, choose **Save to Files** / iCloud Drive when prompted.
- **Load from Files** picks a previous backup. You will be asked to confirm before existing data is replaced.

Excel exports are separate from backups: use Excel for sharing rosters; use JSON backup for full restore of every audition.

## Privacy

All singer data lives in this device’s browser storage (`localStorage`) for the site origin. Hosting the app on GitHub Pages does **not** upload your audition notes to a server.
