import { PassportSelect } from '../selector/PassportSelect.tsx';
import { useStore } from '../../state/store.ts';

const MODES = [
  ['best', 'Best of both'],
  ['difference', 'Where they differ'],
] as const;

export function CompareControls() {
  const base = useStore((s) => s.base)!;
  const passportA = useStore((s) => s.passportA);
  const passportB = useStore((s) => s.passportB);
  const comparing = useStore((s) => s.comparing);
  const compareMode = useStore((s) => s.compareMode);
  const setPassport = useStore((s) => s.setPassport);
  const setComparing = useStore((s) => s.setComparing);
  const setCompareMode = useStore((s) => s.setCompareMode);

  if (!passportA) return null;
  if (!comparing) {
    return (
      <button type="button" className="button button-quiet" onClick={() => setComparing(true)}>
        Compare with another passport
      </button>
    );
  }
  return (
    <>
      <PassportSelect
        label="Second passport"
        countries={base.countries}
        value={passportB}
        exclude={passportA}
        onChange={(code) => setPassport('B', code)}
      />
      {passportB && (
        <fieldset className="segmented">
          <legend>Show on the globe</legend>
          {MODES.map(([mode, label]) => (
            <label key={mode}>
              <input
                type="radio"
                name="compare-mode"
                checked={compareMode === mode}
                onChange={() => setCompareMode(mode)}
              />
              <span>{label}</span>
            </label>
          ))}
        </fieldset>
      )}
      <button type="button" className="button button-quiet" onClick={() => setComparing(false)}>
        Stop comparing
      </button>
    </>
  );
}
