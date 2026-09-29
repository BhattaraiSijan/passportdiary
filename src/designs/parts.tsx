import { CATEGORY_LABELS, CATEGORY_SHORT_HELP } from '../data/labels.ts';
import type { RequirementCategory } from '../data/schema.ts';
import { countByCategory, countByDifference } from '../features/compare/compare.ts';
import { useLegendEntries } from '../map/Legend.tsx';
import { useStore } from '../state/store.ts';
import type { View } from '../state/useView.ts';
import { DESIGNS, setDesign, useDesign } from './design.ts';
import { HINTS, hideHints, useHint } from './hints.ts';
import { useTheme } from './themes.ts';

const EXAMPLES = ['NP', 'IN', 'NG', 'DE'];

// What the start screen says. The heading stays the same in every design.
export function Intro() {
  return (
    <div className="intro">
      <h2>Where can your passport take you?</h2>
      <p>
        Choose your passport. The globe then shows, for every country, what you need to enter.
      </p>
    </div>
  );
}

// One-tap passports, for people who want to see how it works first.
export function Examples() {
  const base = useStore((s) => s.base)!;
  const setPassport = useStore((s) => s.setPassport);
  const examples = EXAMPLES.flatMap((code) => {
    const country = base.byId.get(code);
    return country?.isPassport ? [country] : [];
  });
  if (examples.length === 0) return null;
  return (
    <p className="examples">
      <span>Or try one:</span>
      {examples.map((country) => (
        <button
          key={country.id}
          type="button"
          className="example"
          aria-label={`Try ${country.name}`}
          onClick={() => setPassport('A', country.id)}
        >
          {country.name}
        </button>
      ))}
    </p>
  );
}

const PREVIEW: RequirementCategory[] = ['visa_free', 'visa_on_arrival', 'eta', 'evisa', 'visa_required'];

// A quiet key on the start screen, so the colours make sense before they appear.
export function KeyPreview({ overGlobe = false }: { overGlobe?: boolean }) {
  const theme = useTheme();
  return (
    <div className="key-preview" data-frame={overGlobe ? undefined : 'bottom'}>
      <p>The colours you will see</p>
      <ul>
        {PREVIEW.map((category) => (
          <li key={category}>
            <span className="swatch" style={{ background: theme.categories[category] }} />
            <span>
              {CATEGORY_LABELS[category]}
              <small>{CATEGORY_SHORT_HELP[category]}</small>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// The headline numbers for the chosen passport or pair of passports.
export function Summary({ view }: { view: View }) {
  const base = useStore((s) => s.base)!;
  const compareMode = useStore((s) => s.compareMode);
  const nameA = base.byId.get(view.fileA.passport)?.name ?? view.fileA.passport;
  const nameB = view.fileB ? (base.byId.get(view.fileB.passport)?.name ?? '') : '';

  let figure: string;
  let text: string;
  if (view.comparing && compareMode === 'difference') {
    const counts = countByDifference(view.cells);
    const [name, count] =
      counts.b_better >= counts.a_better ? [nameB, counts.b_better] : [nameA, counts.a_better];
    const [other, otherCount] =
      counts.b_better >= counts.a_better ? [nameA, counts.a_better] : [nameB, counts.b_better];
    figure = String(count);
    text = `${count === 1 ? 'destination is' : 'destinations are'} easier with ${name}, and ${otherCount} with ${other}. ${counts.same} are the same for both.`;
  } else {
    const counts = countByCategory(view.cells);
    const ready = counts.visa_free + counts.visa_on_arrival;
    const online = counts.eta + counts.evisa;
    const total = ready + online + counts.visa_required + counts.no_admission;
    figure = String(ready);
    text = `of ${plural(total, 'destination', 'destinations')} need nothing arranged before you travel${
      view.comparing ? ', using whichever passport is easier' : ''
    }. ${online} more can be arranged online.`;
  }

  return (
    <div className="summary">
      <h2>{view.comparing ? `${nameA} and ${nameB}` : nameA}</h2>
      <p>
        <strong className="figure">{figure}</strong> {text}
      </p>
    </div>
  );
}

// One segment per legend entry, as wide as its share of destinations.
export function ShareBar({ view }: { view: View }) {
  const { entries } = useLegendEntries(view);
  const filter = useStore((s) => s.filter);
  return (
    <div className="share-bar" aria-hidden="true">
      {entries.map((e) => (
        <span
          key={e.key}
          className={filter && filter !== e.key ? 'is-faded' : undefined}
          style={{ flexGrow: e.count, background: e.color }}
        />
      ))}
    </div>
  );
}

export function Hint() {
  const hint = useHint();
  if (!hint) return null;
  return (
    <p className="hint" role="note">
      <span>{HINTS[hint]}</span>
      <button type="button" className="hint-hide" onClick={hideHints}>
        Hide tips
      </button>
    </p>
  );
}

// For trying the designs side by side. Not part of any of them.
export function Switcher() {
  const design = useDesign();
  return (
    <nav className="switcher" aria-label="Design">
      <span>Design</span>
      {DESIGNS.map(({ id, name }) => (
        <button
          key={id}
          type="button"
          title={name}
          aria-label={`Design: ${name}`}
          aria-pressed={design === id}
          onClick={() => setDesign(id)}
        >
          {id === 0 ? 'Now' : id}
        </button>
      ))}
    </nav>
  );
}
