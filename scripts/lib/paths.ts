import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const RAW = resolve(ROOT, 'data/raw');
export const OUT = resolve(ROOT, 'public/data');

export const UPSTREAM = {
  name: 'visa-matrix',
  url: 'https://github.com/xpressmike/visa-matrix',
  commit: '33cf6adec69e108496e72039dc6b29e13f2f3962',
  // Pinned so a changed or truncated raw file fails the build instead of shipping.
  sha256: '7a912283fd41a6cdd574d609c5f9012f8ab67a037cc11980a492d912fa20fd4d',
  expectedPassports: 199,
  expectedCells: 39402,
} as const;

export const DATA_LICENSE = 'CC BY-SA 4.0';
export const DATA_LICENSE_URL = 'https://creativecommons.org/licenses/by-sa/4.0/';
export const DATA_ATTRIBUTION =
  'Visa data: visa-matrix (github.com/xpressmike/visa-matrix) and Wikipedia contributors, CC BY-SA 4.0. Modified: normalised by PassportDiary.';

export function readJson<T = unknown>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

// Deterministic output: keys sorted, so regenerating produces reviewable diffs.
function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => [k, sortKeys(v)]),
    );
  }
  return value;
}

export function writeJson(path: string, value: unknown, pretty = false): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(sortKeys(value), null, pretty ? 2 : undefined) + '\n');
}
