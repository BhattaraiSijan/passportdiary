import { useMemo } from 'react';
import { buildCells, type Cell } from '../features/compare/compare.ts';
import type { PassportFile } from '../data/schema.ts';
import { useStore } from './store.ts';

export interface View {
  fileA: PassportFile;
  fileB: PassportFile | null;
  cells: Map<string, Cell>;
  // True when both passports are loaded and being compared.
  comparing: boolean;
}

export function useView(): View | null {
  const fileA = useStore((s) => (s.passportA ? s.files[s.passportA] : undefined));
  const fileB = useStore((s) => (s.comparing && s.passportB ? s.files[s.passportB] : undefined));
  return useMemo(
    () =>
      fileA
        ? { fileA, fileB: fileB ?? null, cells: buildCells(fileA, fileB), comparing: Boolean(fileB) }
        : null,
    [fileA, fileB],
  );
}
