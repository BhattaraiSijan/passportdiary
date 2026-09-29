import { create } from 'zustand';
import { loadBase, loadPassport, type BaseData } from '../data/load.ts';
import type { PassportFile, RequirementCategory } from '../data/schema.ts';
import type { CompareMode, Difference } from '../features/compare/compare.ts';

const STORAGE_KEY = 'passportdiary.selection';

type Status = 'loading' | 'ready' | 'error';
export type Filter = RequirementCategory | Difference | null;

interface State {
  status: Status;
  error: string | null;
  base: BaseData | null;
  files: Record<string, PassportFile>;
  fileErrors: Record<string, string>;
  passportA: string | null;
  passportB: string | null;
  comparing: boolean;
  compareMode: CompareMode;
  selected: string | null;
  filter: Filter;
  init: () => Promise<void>;
  setPassport: (slot: 'A' | 'B', code: string | null) => void;
  retryPassport: (code: string) => void;
  setComparing: (on: boolean) => void;
  setCompareMode: (mode: CompareMode) => void;
  select: (id: string | null) => void;
  setFilter: (filter: Filter) => void;
}

function readSaved(): { a?: string; b?: string } {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as { a?: string; b?: string };
  } catch {
    return {};
  }
}

function save(a: string | null, b: string | null): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ a: a ?? undefined, b: b ?? undefined }));
  } catch {
    // Storage can be unavailable (private mode); the selection then lasts for this visit only.
  }
}

export const useStore = create<State>((set, get) => {
  async function fetchFile(code: string): Promise<void> {
    const { base, files } = get();
    if (!base || files[code]) return;
    set((s) => ({ fileErrors: { ...s.fileErrors, [code]: '' } }));
    try {
      const file = await loadPassport(code, base.meta.datasetVersion);
      set((s) => ({ files: { ...s.files, [code]: file } }));
    } catch (e) {
      set((s) => ({ fileErrors: { ...s.fileErrors, [code]: (e as Error).message } }));
    }
  }

  return {
    status: 'loading',
    error: null,
    base: null,
    files: {},
    fileErrors: {},
    passportA: null,
    passportB: null,
    comparing: false,
    compareMode: 'best',
    selected: null,
    filter: null,

    init: async () => {
      set({ status: 'loading', error: null });
      try {
        const base = await loadBase();
        const saved = readSaved();
        const valid = (code?: string) => (code && base.byId.get(code)?.isPassport ? code : null);
        const passportA = valid(saved.a);
        const passportB = passportA ? valid(saved.b) : null;
        set({ status: 'ready', base, passportA, passportB, comparing: passportB !== null });
        if (passportA) void fetchFile(passportA);
        if (passportB) void fetchFile(passportB);
      } catch (e) {
        set({ status: 'error', error: (e as Error).message });
      }
    },

    setPassport: (slot, code) => {
      set(slot === 'A' ? { passportA: code } : { passportB: code });
      set({ filter: null });
      save(get().passportA, get().passportB);
      if (code) void fetchFile(code);
    },

    retryPassport: (code) => void fetchFile(code),

    setComparing: (on) => {
      set({ comparing: on, filter: null, compareMode: 'best', ...(on ? {} : { passportB: null }) });
      save(get().passportA, get().passportB);
    },

    setCompareMode: (compareMode) => set({ compareMode, filter: null }),
    select: (selected) => set({ selected }),
    setFilter: (filter) => set({ filter }),
  };
});
