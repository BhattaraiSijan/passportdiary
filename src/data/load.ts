import type { FeatureCollection } from 'geojson';
import { SCHEMA_VERSION } from './categories.ts';
import type { CountriesFile, Country, Meta, PassportFile } from './schema.ts';

export interface BaseData {
  meta: Meta;
  countries: Country[];
  byId: Map<string, Country>;
  world: FeatureCollection;
}

async function fetchJson<T extends { schemaVersion?: number }>(
  path: string,
  init?: RequestInit,
  versioned = true,
): Promise<T> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/${path}`, init);
  if (!response.ok) throw new Error(`Could not load ${path} (HTTP ${response.status})`);
  const json = (await response.json()) as T;
  // The files are produced and validated by our own build, so the app only checks the version.
  if (versioned && json.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(`${path} has an unexpected format. Reload the page to get the latest version.`);
  }
  return json;
}

export async function loadBase(): Promise<BaseData> {
  // meta.json is the only file that is always revalidated; its version keys all others.
  const meta = await fetchJson<Meta>('meta.json', { cache: 'no-cache' });
  const v = encodeURIComponent(meta.datasetVersion);
  const [countriesFile, world] = await Promise.all([
    fetchJson<CountriesFile>(`countries.json?v=${v}`),
    fetchJson<FeatureCollection & { schemaVersion?: number }>(`world.json?v=${v}`, undefined, false),
  ]);
  const countries = [...countriesFile.countries].sort((a, b) => a.name.localeCompare(b.name));
  return { meta, countries, byId: new Map(countries.map((c) => [c.id, c])), world };
}

export function loadPassport(code: string, datasetVersion: string): Promise<PassportFile> {
  return fetchJson<PassportFile>(`passports/${code}.json?v=${encodeURIComponent(datasetVersion)}`);
}
