// Validates the emitted files in public/data. Any problem fails the build.
import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { FeatureCollection } from 'geojson';
import { countriesFileSchema, metaSchema, passportFileSchema } from '../src/data/schema.ts';
import { restrictiveness } from './lib/normalise.ts';
import { OUT, UPSTREAM, readJson } from './lib/paths.ts';

const errors: string[] = [];
const fail = (message: string) => errors.push(message);

const meta = metaSchema.parse(readJson(resolve(OUT, 'meta.json')));
const { countries } = countriesFileSchema.parse(readJson(resolve(OUT, 'countries.json')));
const world = readJson<FeatureCollection>(resolve(OUT, 'world.json'));

const ids = countries.map((c) => c.id);
if (new Set(ids).size !== ids.length) fail('countries.json has duplicate ids');
const byId = new Map(countries.map((c) => [c.id, c]));
const passports = countries.filter((c) => c.isPassport).map((c) => c.id);
const destinations = countries.filter((c) => c.isDestination).map((c) => c.id).sort();

for (const c of countries) {
  if ((c.kind === 'state') !== (c.isPassport && c.isDestination)) {
    fail(`${c.id}: only states may carry visa data`);
  }
  if (c.parent && byId.get(c.parent)?.kind !== 'state') fail(`${c.id}: parent ${c.parent} is not a state`);
}

// Shapes <-> master list, both directions.
const shapeIds = new Set<string>();
for (const f of world.features) {
  const p = (f.properties ?? {}) as { id?: string; code?: string };
  if (!p.id || !byId.has(p.id)) {
    fail(`world.json shape ${p.id} is not in countries.json`);
    continue;
  }
  if (shapeIds.has(p.id)) fail(`world.json has duplicate shape ${p.id}`);
  shapeIds.add(p.id);
  const expectedCode = byId.get(p.id)!.isDestination ? p.id : undefined;
  if (p.code !== expectedCode) fail(`world.json shape ${p.id} has code ${p.code}`);
}
for (const id of ids) if (!shapeIds.has(id)) fail(`${id} has no shape in world.json`);

// Passport files.
const files = readdirSync(resolve(OUT, 'passports')).sort();
const expectedFiles = passports.map((p) => `${p}.json`).sort();
if (files.join() !== expectedFiles.join()) fail('passport files do not match the passports in countries.json');

let cells = 0;
for (const passport of passports) {
  const path = resolve(OUT, `passports/${passport}.json`);
  if (!existsSync(path)) continue;
  const parsed = passportFileSchema.safeParse(readJson(path));
  if (!parsed.success) {
    fail(`${passport}.json: ${parsed.error.issues[0]?.path.join('.')} ${parsed.error.issues[0]?.message}`);
    continue;
  }
  const file = parsed.data;
  if (file.passport !== passport) fail(`${passport}.json declares passport ${file.passport}`);
  if (file.dataAsOf !== meta.dataAsOf) fail(`${passport}.json dataAsOf differs from meta.json`);
  if (Object.keys(file.destinations).sort().join() !== destinations.join()) {
    fail(`${passport}.json does not cover exactly the destination list`);
  }
  for (const [dest, r] of Object.entries(file.destinations)) {
    const pair = `${passport}->${dest}`;
    if ((r.category === 'citizen') !== (dest === passport)) fail(`${pair}: citizen must be self only`);
    if (dest !== passport) cells++;
    if (r.claims) {
      if (new Set(r.claims.map((c) => c.category)).size < 2) fail(`${pair}: claims do not differ`);
      const worst = Math.max(...r.claims.map((c) => restrictiveness(c.category)));
      if (restrictiveness(r.category) !== worst) fail(`${pair}: not showing the most restrictive claim`);
    }
  }
}

if (cells !== meta.cellCount) fail(`cell count ${cells} differs from meta.json ${meta.cellCount}`);
if (meta.overrideCount === 0 && cells !== UPSTREAM.expectedCells) {
  fail(`cell count ${cells} differs from pinned upstream ${UPSTREAM.expectedCells}`);
}
if (passports.length !== UPSTREAM.expectedPassports) fail(`expected ${UPSTREAM.expectedPassports} passports`);

if (errors.length) {
  console.error(`validate: ${errors.length} problem(s)`);
  for (const e of errors.slice(0, 50)) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`validate: ok (${passports.length} passports, ${cells} cells, ${shapeIds.size} shapes)`);
