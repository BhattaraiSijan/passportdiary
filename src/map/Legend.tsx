import { CATEGORIES } from '../data/categories.ts';
import { CATEGORY_HELP, CATEGORY_LABELS, CATEGORY_SHORT_HELP } from '../data/labels.ts';
import { useTheme } from '../designs/themes.ts';
import {
  countByCategory,
  countByDifference,
  type Difference,
} from '../features/compare/compare.ts';
import { useStore, type Filter } from '../state/store.ts';
import type { View } from '../state/useView.ts';

export interface Entry {
  key: NonNullable<Filter>;
  label: string;
  help?: string;
  shortHelp?: string;
  color: string;
  count: number;
}

// The legend, the proportion bar and the summary all read the same entries.
export function useLegendEntries(view: View): { entries: Entry[]; byDifference: boolean } {
  const base = useStore((s) => s.base)!;
  const compareMode = useStore((s) => s.compareMode);
  const theme = useTheme();

  const nameA = base.byId.get(view.fileA.passport)?.name ?? view.fileA.passport;
  const nameB = view.fileB ? (base.byId.get(view.fileB.passport)?.name ?? view.fileB.passport) : '';
  const byDifference = view.comparing && compareMode === 'difference';

  if (byDifference) {
    const counts = countByDifference(view.cells);
    const labels: Record<Difference, string> = {
      a_better: `Easier with ${nameA}`,
      b_better: `Easier with ${nameB}`,
      same: 'Same for both',
    };
    const entries = (Object.keys(labels) as Difference[]).map((key) => ({
      key,
      label: labels[key],
      color: theme.differences[key],
      count: counts[key],
    }));
    return { entries, byDifference };
  }
  const counts = countByCategory(view.cells);
  const entries = CATEGORIES.filter((c) => c !== 'unknown' && counts[c] > 0).map((key) => ({
    key,
    label: CATEGORY_LABELS[key],
    help: CATEGORY_HELP[key],
    shortHelp: CATEGORY_SHORT_HELP[key],
    color: theme.categories[key],
    count: counts[key],
  }));
  return { entries, byDifference };
}

interface Props {
  view: View;
  // Adds a line under each entry that says what the term means.
  explain?: boolean;
}

export function Legend({ view, explain = false }: Props) {
  const filter = useStore((s) => s.filter);
  const setFilter = useStore((s) => s.setFilter);
  const theme = useTheme();
  const { entries, byDifference } = useLegendEntries(view);
  const most = Math.max(1, ...entries.map((e) => e.count));

  return (
    <ul className="legend" aria-label="Legend. Choose an entry to highlight it.">
      {entries.map((e) => (
        <li key={e.key}>
          <button
            type="button"
            className="legend-item"
            aria-pressed={filter === e.key}
            title={explain ? undefined : e.help}
            onClick={() => setFilter(filter === e.key ? null : e.key)}
          >
            <span className="swatch" style={{ background: e.color }} />
            <span>{e.label}</span>
            <span className="count">{e.count}</span>
            {explain && (
              <>
                {e.shortHelp && <span className="legend-help">{e.shortHelp}</span>}
                <span className="legend-bar" aria-hidden="true">
                  <span style={{ width: `${(e.count / most) * 100}%`, background: e.color }} />
                </span>
              </>
            )}
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
        <span className="swatch" style={{ background: theme.categories.unknown }} />
        <span>No data</span>
      </li>
    </ul>
  );
}
