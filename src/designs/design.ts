import { useSyncExternalStore } from 'react';

// 0 is the design the app first shipped with. 1 is the chosen direction and the
// default. 2 and 3 are the other directions that were explored.
export type Design = 0 | 1 | 2 | 3;

export const DESIGNS: { id: Design; name: string }[] = [
  { id: 0, name: 'Current' },
  { id: 1, name: 'Visa page' },
  { id: 2, name: 'Departures' },
  { id: 3, name: 'Night flight' },
];

export const DEFAULT: Design = 1;

const STORAGE_KEY = 'passportdiary.design';
const PARAM = 'design';

const parse = (value: string | null | undefined): Design | null =>
  value === '0' || value === '1' || value === '2' || value === '3'
    ? (Number(value) as Design)
    : null;

function read(): Design {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage can be unavailable; the URL still works.
  }
  const fromUrl = parse(new URLSearchParams(window.location.search).get(PARAM));
  return fromUrl ?? parse(stored) ?? DEFAULT;
}

function remember(design: Design): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(design));
  } catch {
    // The choice then lasts for this visit only.
  }
}

function apply(design: Design): void {
  const root = document.documentElement;
  if (design === 0) delete root.dataset.design;
  else root.dataset.design = String(design);
}

let current: Design = DEFAULT;
const listeners = new Set<() => void>();

export function initDesign(): void {
  current = read();
  if (new URLSearchParams(window.location.search).has(PARAM)) remember(current);
  apply(current);
}

export function setDesign(design: Design): void {
  if (design === current) return;
  current = design;
  remember(design);
  apply(design);
  const url = new URL(window.location.href);
  url.searchParams.set(PARAM, String(design));
  window.history.replaceState(null, '', url);
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};

export const useDesign = (): Design => useSyncExternalStore(subscribe, () => current);
