import { CATEGORY_LABELS, CATEGORY_SHORT_HELP } from '../../data/labels.ts';
import type { RequirementCategory } from '../../data/schema.ts';
import { CATEGORY_COLORS } from '../../map/palette.ts';
import { useStore } from '../../state/store.ts';

// What a first-time visitor sees: what this is, and the one thing to do first.

const EXAMPLES = ['NP', 'IN', 'NG', 'DE'];

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

const PREVIEW: RequirementCategory[] = [
  'visa_free',
  'visa_on_arrival',
  'eta',
  'evisa',
  'visa_required',
];

// A quiet key, so the colours make sense before they appear on the globe.
export function KeyPreview() {
  return (
    <div className="key-preview">
      <p>The colours you will see</p>
      <ul>
        {PREVIEW.map((category) => (
          <li key={category}>
            <span className="swatch" style={{ background: CATEGORY_COLORS[category] }} />
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
