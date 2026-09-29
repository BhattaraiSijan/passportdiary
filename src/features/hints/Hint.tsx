import { HINTS, hideHints, useHint } from './hints.ts';

// One short tip at a time, inside a surface that is already there.
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
