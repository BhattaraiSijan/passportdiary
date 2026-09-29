import { useSyncExternalStore } from 'react';
import { useStore } from '../../state/store.ts';

// Short tips that lead a newcomer to the next thing to try. Each one goes away
// for good once the person has done what it suggests, or has hidden the tips.
export type HintKey = 'detail' | 'filter' | 'compare';

interface Done {
  detail?: boolean;
  filter?: boolean;
  compare?: boolean;
  hidden?: boolean;
}

const STORAGE_KEY = 'passportdiary.hints';

export const HINTS: Record<HintKey, string> = {
  detail: 'Tap a country on the globe, or a name in the list, to see what you need to enter.',
  filter: 'Tap a colour in the key to show only those countries.',
  compare: 'Do you hold two passports? Use “Compare with another passport” at the top.',
};

const ORDER: HintKey[] = ['detail', 'filter', 'compare'];

function read(): Done {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Done;
  } catch {
    return {};
  }
}

let done: Done = read();
const listeners = new Set<() => void>();

function mark(key: keyof Done): void {
  if (done[key]) return;
  done = { ...done, [key]: true };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(done));
  } catch {
    // Without storage the tips come back on the next visit.
  }
  listeners.forEach((listener) => listener());
}

useStore.subscribe((state, previous) => {
  if (state.selected && state.selected !== previous.selected) mark('detail');
  if (state.filter && state.filter !== previous.filter) mark('filter');
  if (state.comparing && !previous.comparing) mark('compare');
});

export const hideHints = () => mark('hidden');

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};

// The one tip to show now, if any.
export function useHint(): HintKey | null {
  const state = useSyncExternalStore(subscribe, () => done);
  if (state.hidden) return null;
  return ORDER.find((key) => !state[key]) ?? null;
}
