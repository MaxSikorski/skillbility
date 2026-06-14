# skillbility-app

The Skillbility storefront — built on the Sikorski Design System, reading the
registry. This folder is the **future single repo** (the storefront + the
registry together, per the one-repo decision).

## How to open it
**Double-click `index.html`.** It works straight from `file://` — no server, no
build step, fully offline (GSAP is vendored in `lib/`).

## How the catalog loads
The registry (`registry/index.json`) is the single source of truth.
- **Hosted / served** (GitHub Pages, or a local server): the page fetches the
  live `registry/index.json`, so it auto-updates as skills are added.
- **Opened from `file://`** (double-click): browsers block `fetch()` for
  security, so the page falls back to an embedded copy of the catalog in
  `script.js` (`INDEX_FALLBACK`). **Keep that copy in sync with
  `registry/index.json`** when skills change (a tiny generator script will
  automate this later).

## Files
```
index.html          the store page
styles.css          Sikorski Design System (monochrome + quiet muted risk colors)
script.js           catalog load (live fetch + offline fallback), theme toggle, GSAP reveals
lib/gsap.min.js     vendored GSAP 3.12.5 (offline-proof)
registry/           the catalog: index.json + skills/<id>/ (skill.json + payload)
```

## Notes
- Risk colors are the one sanctioned exception to the "no color" rule — quiet,
  muted only (see the project `CLAUDE.md`).
- The "Connect your printer" command points at the one-repo URL
  (`MaxSikorski/skillbility`) and goes live once the registry is published.
- Nothing here has been run against a real printer yet.
