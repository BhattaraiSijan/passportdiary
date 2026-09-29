// data/raw/visa-matrix.json (pinned) -> public/data/passports/*.json + meta.json
import { createHash } from 'node:crypto';
import { readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  SCHEMA_VERSION,
  overridesFileSchema,
  type Meta,
  type PassportFile,
  type Requirement,
} from '../src/data/schema.ts';
import { applyOverride, normaliseCell, upstreamFileSchema } from './lib/normalise.ts';
import {
  DATA_ATTRIBUTION,
  DATA_LICENSE,
  DATA_LICENSE_URL,
  OUT,
  RAW,
  ROOT,
  UPSTREAM,
  readJson,
  writeJson,
} from './lib/paths.ts';

const rawPath = resolve(RAW, 'visa-matrix.json');
const sha256 = createHash('sha256').update(readFileSync(rawPath)).digest('hex');
if (sha256 !== UPSTREAM.sha256) {
  throw new Error(
    `data/raw/visa-matrix.json does not match the pinned snapshot (sha256 ${sha256}). ` +
      'If this is an intended data update, update UPSTREAM in scripts/lib/paths.ts.',
  );
}

const upstream = upstreamFileSchema.parse(readJson(rawPath));
const codes = [...upstream.meta.passports].sort();
const codeSet = new Set(codes);
const overrides = overridesFileSchema.parse(readJson(resolve(ROOT, 'data/overrides.json')));

if (codes.length !== UPSTREAM.expectedPassports) {
  throw new Error(`expected ${UPSTREAM.expectedPassports} passports, got ${codes.length}`);
}

rmSync(resolve(OUT, 'passports'), { recursive: true, force: true });

let cellCount = 0;
for (const passport of codes) {
  const row = upstream.matrix[passport];
  if (!row) throw new Error(`no matrix row for passport ${passport}`);

  const destinations: Record<string, Requirement> = {};
  for (const destination of codes) {
    if (destination === passport) {
      destinations[destination] = { category: 'citizen', confidence: 'high', source: 'self' };
      continue;
    }
    const cell = row[destination];
    if (!cell) throw new Error(`missing cell ${passport}->${destination}`);
    try {
      destinations[destination] = normaliseCell(cell);
    } catch (e) {
      throw new Error(`${passport}->${destination}: ${(e as Error).message}`, { cause: e });
    }
    cellCount++;
  }
  const extra = Object.keys(row).filter((d) => !codeSet.has(d) || d === passport);
  if (extra.length) throw new Error(`unexpected destinations for ${passport}: ${extra.join(', ')}`);

  for (const o of overrides.filter((o) => o.passport === passport)) {
    if (!codeSet.has(o.destination) || o.destination === passport) {
      throw new Error(`override ${o.passport}->${o.destination} targets an unknown pair`);
    }
    destinations[o.destination] = applyOverride(o);
  }

  const file: PassportFile = {
    schemaVersion: SCHEMA_VERSION,
    passport,
    dataAsOf: upstream.meta.generated,
    license: DATA_LICENSE,
    attribution: DATA_ATTRIBUTION,
    destinations,
  };
  writeJson(resolve(OUT, `passports/${passport}.json`), file);
}

const unknownOverride = overrides.find((o) => !codeSet.has(o.passport));
if (unknownOverride) throw new Error(`override for unknown passport ${unknownOverride.passport}`);

if (cellCount !== UPSTREAM.expectedCells) {
  throw new Error(`expected ${UPSTREAM.expectedCells} cells, got ${cellCount}`);
}

const meta: Meta = {
  schemaVersion: SCHEMA_VERSION,
  datasetVersion: `${upstream.meta.generated}.${overrides.length}`,
  dataAsOf: upstream.meta.generated,
  passportCount: codes.length,
  cellCount,
  license: DATA_LICENSE,
  licenseUrl: DATA_LICENSE_URL,
  attribution: DATA_ATTRIBUTION,
  upstream: { name: UPSTREAM.name, url: UPSTREAM.url, commit: UPSTREAM.commit, sha256 },
  overrideCount: overrides.length,
};
writeJson(resolve(OUT, 'meta.json'), meta, true);

console.log(`import: ${codes.length} passports, ${cellCount} cells, ${overrides.length} overrides`);
