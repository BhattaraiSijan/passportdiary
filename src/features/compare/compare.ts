import { CATEGORIES } from '../../data/categories.ts';
import type { PassportFile, Requirement, RequirementCategory } from '../../data/schema.ts';

export type CompareMode = 'best' | 'difference';
export type Difference = 'a_better' | 'b_better' | 'same';

export interface Cell {
  // What the globe and legend show for this destination.
  category: RequirementCategory;
  a: Requirement;
  b?: Requirement;
  difference?: Difference;
  conflicting: boolean;
}

// Lower is better. `unknown` is never better than anything.
export const rank = (category: RequirementCategory): number => CATEGORIES.indexOf(category);

export function better(a: Requirement, b: Requirement): Requirement {
  if (rank(a.category) !== rank(b.category)) return rank(a.category) < rank(b.category) ? a : b;
  // Same requirement: the longer permitted stay wins.
  return (b.maxStayDays ?? 0) > (a.maxStayDays ?? 0) ? b : a;
}

export function difference(a: Requirement, b: Requirement): Difference {
  if (rank(a.category) === rank(b.category)) return 'same';
  return rank(a.category) < rank(b.category) ? 'a_better' : 'b_better';
}

const NO_DATA: Requirement = { category: 'unknown', confidence: 'medium', source: 'none' };

export function buildCells(a: PassportFile, b?: PassportFile): Map<string, Cell> {
  const cells = new Map<string, Cell>();
  for (const [code, reqA] of Object.entries(a.destinations)) {
    if (!b) {
      cells.set(code, { category: reqA.category, a: reqA, conflicting: reqA.confidence === 'conflicting' });
      continue;
    }
    const reqB = b.destinations[code] ?? NO_DATA;
    const best = better(reqA, reqB);
    cells.set(code, {
      category: best.category,
      a: reqA,
      b: reqB,
      difference: difference(reqA, reqB),
      conflicting: best.confidence === 'conflicting',
    });
  }
  return cells;
}

export function countByCategory(cells: Map<string, Cell>): Record<RequirementCategory, number> {
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<RequirementCategory, number>;
  for (const cell of cells.values()) counts[cell.category]++;
  return counts;
}

export function countByDifference(cells: Map<string, Cell>): Record<Difference, number> {
  const counts: Record<Difference, number> = { a_better: 0, b_better: 0, same: 0 };
  for (const cell of cells.values()) if (cell.difference) counts[cell.difference]++;
  return counts;
}
