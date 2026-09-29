// Natural Earth 50m -> public/data/world.json (shapes) + public/data/countries.json (master list)
import { resolve } from 'node:path';
import type { Feature, FeatureCollection } from 'geojson';
import mapshaper from 'mapshaper';
import { z } from 'zod';
import {
  SCHEMA_VERSION,
  countryKindSchema,
  type CountriesFile,
  type Country,
  type CountryKind,
} from '../src/data/schema.ts';
import { OUT, RAW, ROOT, readJson, writeJson } from './lib/paths.ts';
import { upstreamFileSchema } from './lib/normalise.ts';

// Below this land area a country cannot be reliably seen or tapped on the globe.
const TINY_AREA_KM2 = 6000;
const SIMPLIFY = '9%';

const overridesSchema = z.record(
  z.string().regex(/^[A-Z]{3}$/),
  z.strictObject({
    id: z.string().regex(/^[A-Z]{2,3}$/),
    name: z.string(),
    kind: countryKindSchema,
    parent: z.string().regex(/^[A-Z]{2}$/).optional(),
  }),
);

type Props = Record<string, string | number | null>;
const isCode = (v: unknown): v is string => typeof v === 'string' && /^[A-Z]{2}$/.test(v);

const upstream = upstreamFileSchema.parse(readJson(resolve(RAW, 'visa-matrix.json')));
const dataCodes = new Set(upstream.meta.passports);
const nameToCode = readJson<Record<string, string>>(resolve(RAW, 'countries-iso2.json'));
const dataNames = new Map(Object.entries(nameToCode).map(([name, code]) => [code, name]));
const shapeOverrides = overridesSchema.parse(readJson(resolve(ROOT, 'data/shape-overrides.json')));

const neCountries = readJson<FeatureCollection>(resolve(RAW, 'ne_50m_admin_0_countries.geojson'));
const neUnits = readJson<FeatureCollection>(resolve(RAW, 'ne_50m_admin_0_map_units.geojson'));

// ISO_A2 is unusable (-99 for France and Norway, CN-TW for Taiwan): ISO_A2_EH is the fixed field.
const byA3 = new Map<string, Props>();
const adminToCode = new Map<string, string>();
for (const f of neCountries.features) {
  const p = f.properties as Props;
  byA3.set(String(p.ADM0_A3), p);
  if (isCode(p.ISO_A2_EH) && dataCodes.has(p.ISO_A2_EH)) adminToCode.set(String(p.ADMIN), p.ISO_A2_EH);
}

interface ShapeInfo {
  id: string;
  name: string;
  kind: CountryKind;
  parent?: string;
}
const shapes = new Map<string, ShapeInfo>();

function register(info: ShapeInfo): string {
  const existing = shapes.get(info.id);
  if (existing && existing.kind !== info.kind) {
    throw new Error(`shape id ${info.id} registered as both ${existing.kind} and ${info.kind}`);
  }
  if (!existing) shapes.set(info.id, info);
  return info.id;
}

function territoryOrNoData(id: string, name: string, sovereign: string | undefined): ShapeInfo {
  // Entry rules of territories often differ from the administering state, so the
  // parent is recorded for context only and never used to colour the shape.
  return sovereign && sovereign !== id
    ? { id, name, kind: 'territory', parent: sovereign }
    : { id, name, kind: 'no_data' };
}

function shapeIdFor(unit: Props): string {
  const a3 = String(unit.ADM0_A3);
  const country = byA3.get(a3);
  if (!country) throw new Error(`map unit ${unit.NAME} has unknown ADM0_A3 ${a3}`);
  const countryCode = country.ISO_A2_EH;
  const unitCode = unit.ISO_A2_EH;
  const sovereign = adminToCode.get(String(country.SOVEREIGNT));

  // A map unit with its own ISO code (French Guiana, Svalbard, ...) is split from its country.
  if (isCode(unitCode) && unitCode !== countryCode && !dataCodes.has(unitCode)) {
    return register(territoryOrNoData(unitCode, String(unit.NAME_LONG), sovereign));
  }
  const override = shapeOverrides[a3];
  if (override) return register(override);
  if (!isCode(countryCode)) {
    throw new Error(`${country.NAME} (${a3}) has no ISO code: add it to data/shape-overrides.json`);
  }
  if (dataCodes.has(countryCode)) {
    return register({ id: countryCode, name: dataNames.get(countryCode) ?? String(country.NAME_LONG), kind: 'state' });
  }
  return register(territoryOrNoData(countryCode, String(country.NAME_LONG), sovereign));
}

const input: FeatureCollection = {
  type: 'FeatureCollection',
  features: neUnits.features.map(
    (f): Feature => ({ type: 'Feature', geometry: f.geometry, properties: { id: shapeIdFor(f.properties as Props) } }),
  ),
};

const commands = [
  '-i in.geojson',
  '-dissolve id',
  // Measured before simplification so area and label point reflect the real shape.
  '-each "areaKm2 = Math.round(this.area / 1e6), cx = this.innerX, cy = this.innerY"',
  `-simplify ${SIMPLIFY} weighted keep-shapes`,
  '-clean',
  '-o out.geojson precision=0.01',
].join(' ');
const output = await mapshaper.applyCommands(commands, { 'in.geojson': JSON.stringify(input) });
const outFile = output['out.geojson'];
if (!outFile) throw new Error('mapshaper produced no output');
const dissolved = JSON.parse(outFile.toString()) as FeatureCollection;

const countries: Country[] = [];
const features: Feature[] = [];
for (const f of dissolved.features) {
  const p = f.properties as { id: string; areaKm2: number; cx: number; cy: number };
  const info = shapes.get(p.id);
  if (!info) throw new Error(`dissolved shape ${p.id} has no metadata`);
  if (!f.geometry) throw new Error(`shape ${p.id} lost its geometry during simplification`);
  const inData = info.kind === 'state';
  countries.push({
    id: info.id,
    name: info.name,
    kind: info.kind,
    isPassport: inData,
    isDestination: inData,
    ...(info.parent ? { parent: info.parent } : {}),
    centroid: [Number(p.cx.toFixed(3)), Number(p.cy.toFixed(3))],
    isTiny: p.areaKm2 < TINY_AREA_KM2,
  });
  features.push({
    type: 'Feature',
    geometry: f.geometry,
    // `code` is the join key into the visa data; absent for shapes we have no data for.
    properties: { id: info.id, name: info.name, kind: info.kind, ...(inData ? { code: info.id } : {}) },
  });
}
countries.sort((a, b) => a.id.localeCompare(b.id));
features.sort((a, b) => String(a.properties!.id).localeCompare(String(b.properties!.id)));

const missing = [...dataCodes].filter((c) => !shapes.has(c));
if (missing.length) throw new Error(`visa data countries without a map shape: ${missing.join(', ')}`);

const countriesFile: CountriesFile = { schemaVersion: SCHEMA_VERSION, countries };
writeJson(resolve(OUT, 'countries.json'), countriesFile);
writeJson(resolve(OUT, 'world.json'), { type: 'FeatureCollection', features });

const kinds = countries.reduce<Record<string, number>>((n, c) => ({ ...n, [c.kind]: (n[c.kind] ?? 0) + 1 }), {});
console.log(`shapes: ${countries.length}`, kinds, `tiny: ${countries.filter((c) => c.isTiny).length}`);
