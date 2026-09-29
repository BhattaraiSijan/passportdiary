import { CATEGORY_LABELS, CATEGORY_SHORT_HELP } from '../../data/labels.ts';
import type { RequirementCategory } from '../../data/schema.ts';
import { CATEGORY_COLORS } from '../../map/palette.ts';

// What a first-time visitor sees: what this is, and the one thing to do first.

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
