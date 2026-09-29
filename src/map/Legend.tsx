import { CATEGORIES } from '../data/categories.ts';
import { CATEGORY_LABELS, CATEGORY_SHORT_HELP } from '../data/labels.ts';
import {
  countByCategory,
  countByDifference,
  type Difference,
} from '../features/compare/compare.ts';
import { useStore, type Filter } from '../state/store.ts';
import type { View } from '../state/useView.ts';
import { CATEGORY_COLORS, DIFFERENCE_COLORS } from './palette.ts';

interface Entry {
  key: NonNullable<Filter>;
  label: string;
  // One line that says what the term means.
  help?: string;
  color: string;
  count: number;
}

// The key to the globe. Each entry is also a filter.
export function Legend({ view }: { view: View }) {
  const base = useStore((s) => s.base)!;
  const filter = useStore((s) => s.filter);
  const setFilter = useStore((s) => s.setFilter);
  const compareMode = useStore((s) => s.compareMode);

  const nameA = base.byId.get(view.fileA.passport)?.name ?? view.fileA.passport;
  const nameB = view.fileB ? (base.byId.get(view.fileB.passport)?.name ?? view.fileB.passport) : '';
  const byDifference = view.comparing && compareMode === 'difference';

  let entries: Entry[];
  if (byDifference) {
    const counts = countByDifference(view.cells);
    const labels: Record<Difference, string> = {
      a_better: `Easier with ${nameA}`,
      b_better: `Easier with ${nameB}`,
      same: 'Same for both',
    };
    entries = (Object.keys(labels) as Difference[]).map((key) => ({
      key,
      label: labels[key],
      color: DIFFERENCE_COLORS[key],
      count: counts[key],
    }));
  } else {
    const counts = countByCategory(view.cells);
    entries = CATEGORIES.filter((c) => c !== 'unknown' && counts[c] > 0).map((key) => ({
      key,
      label: CATEGORY_LABELS[key],
      help: CATEGORY_SHORT_HELP[key],
      color: CATEGORY_COLORS[key],
      count: counts[key],
    }));
  }
  const most = Math.max(1, ...entries.map((e) => e.count));

  return (
    <ul className="legend" aria-label="Legend. Choose an entry to highlight it.">
      {entries.map((e) => (
        <li key={e.key}>
          <button
            type="button"
            className="legend-item"
            aria-pressed={filter === e.key}
            onClick={() => setFilter(filter === e.key ? null : e.key)}
          >
            <span className="swatch" style={{ background: e.color }} />
            <span>{e.label}</span>
            <span className="count">{e.count}</span>
            {e.help && <span className="legend-help">{e.help}</span>}
            <span className="legend-bar" aria-hidden="true">
              <span style={{ width: `${(e.count / most) * 100}%`, background: e.color }} />
            </span>
          </button>
        </li>
      ))}
      {!byDifference && (
        <li className="legend-note">
          <span className="swatch swatch-hatch" />
          <span>Striped: sources disagree</span>
        </li>
      )}
      <li className="legend-note">
        <span className="swatch" style={{ background: CATEGORY_COLORS.unknown }} />
        <span>No data</span>
      </li>
    </ul>
  );
}
