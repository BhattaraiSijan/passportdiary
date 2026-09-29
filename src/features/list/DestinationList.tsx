import { useMemo, useState } from 'react';
import { CATEGORIES } from '../../data/categories.ts';
import { CATEGORY_LABELS, formatStay } from '../../data/labels.ts';
import type { Country, Requirement } from '../../data/schema.ts';
import { useTheme } from '../../designs/themes.ts';
import { useStore } from '../../state/store.ts';
import type { View } from '../../state/useView.ts';
import type { Cell, Difference } from '../compare/compare.ts';

interface Row {
  country: Country;
  cell: Cell;
}

interface Group {
  key: string;
  label: string;
  color: string;
  rows: Row[];
}

const DIFFERENCES: Difference[] = ['a_better', 'b_better', 'same'];

const summary = (r: Requirement) =>
  [CATEGORY_LABELS[r.category], formatStay(r.maxStayDays)].filter(Boolean).join(', ');

export function DestinationList({ view }: { view: View }) {
  const base = useStore((s) => s.base)!;
  const filter = useStore((s) => s.filter);
  const setFilter = useStore((s) => s.setFilter);
  const select = useStore((s) => s.select);
  const compareMode = useStore((s) => s.compareMode);
  const [query, setQuery] = useState('');
  const theme = useTheme();

  const byDifference = view.comparing && compareMode === 'difference';
  const nameA = base.byId.get(view.fileA.passport)?.name ?? view.fileA.passport;
  const nameB = view.fileB ? (base.byId.get(view.fileB.passport)?.name ?? '') : '';

  const groups = useMemo<Group[]>(() => {
    const q = query.trim().toLowerCase();
    const rows: Row[] = base.countries
      .filter((c) => c.isDestination && (q === '' || c.name.toLowerCase().includes(q)))
      .flatMap((country) => {
        const cell = view.cells.get(country.id);
        return cell ? [{ country, cell }] : [];
      });

    const all: Group[] = byDifference
      ? DIFFERENCES.map((key) => ({
          key,
          label: { a_better: `Easier with ${nameA}`, b_better: `Easier with ${nameB}`, same: 'Same for both' }[key],
          color: theme.differences[key],
          rows: rows.filter((r) => r.cell.difference === key),
        }))
      : CATEGORIES.map((key) => ({
          key,
          label: CATEGORY_LABELS[key],
          color: theme.categories[key],
          rows: rows.filter((r) => r.cell.category === key),
        }));
    return all.filter((g) => g.rows.length > 0 && (!filter || filter === g.key));
  }, [base, view, query, filter, byDifference, nameA, nameB, theme]);

  return (
    <section className="list" aria-label="Destinations">
      <div className="list-tools">
        <label className="search">
          <span className="visually-hidden">Search destinations</span>
          <input
            type="search"
            placeholder="Search destinations"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        {filter && (
          <button type="button" className="button button-quiet" onClick={() => setFilter(null)}>
            Show all
          </button>
        )}
      </div>

      {groups.length === 0 && <p className="empty">No destination matches “{query}”.</p>}

      {groups.map((group) => (
        <section key={group.key} className="group">
          <h3>
            <span className="swatch" style={{ background: group.color }} />
            {group.label}
            <span className="count">{group.rows.length}</span>
          </h3>
          <ul>
            {group.rows.map(({ country, cell }) => (
              <li key={country.id}>
                <button type="button" className="row" onClick={() => select(country.id)}>
                  <span className="row-name">{country.name}</span>
                  {cell.b ? (
                    <span className="row-detail">
                      <span>
                        {nameA}: {summary(cell.a)}
                      </span>
                      <span>
                        {nameB}: {summary(cell.b)}
                      </span>
                    </span>
                  ) : (
                    <span className="row-detail">
                      {cell.a.freedomOfMovement ? 'Free movement' : formatStay(cell.a.maxStayDays)}
                    </span>
                  )}
                  {cell.conflicting && <span className="flag">Sources disagree</span>}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </section>
  );
}
