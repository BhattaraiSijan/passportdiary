# PassportDiary

Pick your passport and see what every country asks of you at the border, on an interactive
globe: visa-free, visa on arrival, travel authorisation (ETA), eVisa, or a visa from an embassy.

A static site: React, TypeScript, Vite and MapLibre GL JS. No backend, no API keys, no
third-party tile servers.

## Run it

```sh
npm install
npm run dev        # http://localhost:5173
```

| Command | What it does |
|---|---|
| `npm run check` | Type check, lint, unit tests and data validation |
| `npm run test:e2e` | Browser tests against the production build (run `npx playwright install chromium` once) |
| `npm run build` | Production build in `dist/`, deployable to any static host |
| `npm run data:build` | Regenerate `public/data/` from `data/raw/` and validate it |
| `npm run screens` | Take the screenshots in `docs/screens/` (needs `npx vite --port 5183 --strictPort` running) |

The design (colours, typeface, layout, start screen, measured contrast) is described in
[`docs/DESIGN.md`](docs/DESIGN.md).

## How the data flows

```
data/raw/visa-matrix.json      pinned upstream snapshot (commit + sha256)
data/raw/ne_50m_*.geojson      Natural Earth country shapes
data/overrides.json            our corrections, each with a date and an official source
data/shape-overrides.json      shapes without an ISO code (Somaliland, Northern Cyprus, ...)
data/country-names.json        the display name where upstream has several
        |
        |  scripts/import-visa-matrix.ts, scripts/build-shapes.ts, scripts/validate.ts
        v
public/data/meta.json          dataset version, date, attribution
public/data/countries.json     master list: the join between visa data and map shapes
public/data/world.json         simplified shapes for the globe
public/data/passports/NP.json  one file per passport, loaded on demand
```

The app only reads `public/data/`, in the format defined in `src/data/schema.ts`. Changing
or adding a data source means changing the importer, not the app. Generated files are
committed, and CI fails if they do not match what the scripts produce.

### Rules the data follows

- **Never guess.** Missing data is shown as "No data". Territories (Greenland, French
  Guiana, Puerto Rico, ...) do not inherit the rules of the state that administers them.
- **When sources disagree, show the stricter answer** and list every claim. About 8% of
  passport and destination pairs are like this.
- **The build fails** on an unknown country code, an unknown requirement type, a passport
  file that does not cover every destination, a shape that joins to nothing, or a raw file
  that does not match its pinned checksum.

### Correcting a requirement

Add an entry to `data/overrides.json`, then run `npm run data:build`:

```json
{
  "passport": "NP",
  "destination": "KR",
  "category": "visa_required",
  "date": "2026-09-29",
  "reason": "Confirmed on the embassy website",
  "sourceUrl": "https://example.gov/visa"
}
```

### Updating to a newer snapshot

Replace `data/raw/visa-matrix.json`, update `UPSTREAM` in `scripts/lib/paths.ts` (commit,
sha256, expected counts) and run `npm run data:build`. Review the diff of `public/data/`
before committing.

## Roadmap

Done: data pipeline, globe, passport selector, destination list with search and filter,
country detail panel, compare two passports, start screen for first-time visitors, tips that
go away once used, and a way to start over.

Next, in rough order:

1. Shareable links and a page per passport
2. Scheduled data refresh that opens a pull request with a diff for review
3. Official source links per destination
4. Street-level basemap when zoomed in (OpenFreeMap, later self-hosted Protomaps)
5. Territories with their own rules, transit rules, access through residence permits

## Deployment

The site is hosted on GitHub Pages. Every push to `main` runs the checks and the browser
tests, builds the site and publishes `dist/` (see `.github/workflows/deploy.yml`). Nothing
is published if a check fails.

## Licences

Code: MIT, see `LICENSE`. Data in `data/` and `public/data/`: CC BY-SA 4.0 (visa data) and
public domain (map shapes), see `DATA_LICENSE.md`.

This is general information, not legal advice. Always check with the destination's official
sources before you travel.
