# Data licence

Everything under `data/` and `public/data/` is data, not code, and is **not** covered by
the MIT licence in `LICENSE`.

## Visa requirement data — CC BY-SA 4.0

Files: `data/raw/visa-matrix.json`, `data/raw/countries-iso2.json`, `data/overrides.json`,
`public/data/passports/*.json`, `public/data/meta.json`.

- Source: [visa-matrix](https://github.com/xpressmike/visa-matrix), commit
  `33cf6adec69e108496e72039dc6b29e13f2f3962`, itself built from English Wikipedia's
  "Visa requirements for … citizens" pages (Wikipedia contributors) and cross-checked
  against Passport Index data.
- Licence: [Creative Commons Attribution-ShareAlike 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
- Changes made: normalised into PassportDiary's schema; where sources disagree, the most
  restrictive claim is shown and all claims are kept; corrections from
  `data/overrides.json` are applied on top.
- If you redistribute these files or anything derived from them, you must give the same
  attribution and share under the same licence.

No warranty. This is general information, not legal advice. Rules change: always verify
with the destination's official government source before travelling.

## Map shapes — public domain

Files: `data/raw/ne_50m_*.geojson`, `public/data/world.json`, `public/data/countries.json`.

Made with [Natural Earth](https://www.naturalearthdata.com/) v5.1.2, which is in the public
domain. Boundaries are simplified and show de facto control; they do not imply any
endorsement or opinion on the status of any territory.
