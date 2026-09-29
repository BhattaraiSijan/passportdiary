import { useEffect } from 'react';
import { CompareControls } from './features/compare/CompareControls.tsx';
import { Credits } from './features/credits/Credits.tsx';
import { CountryPanel } from './features/detail/CountryPanel.tsx';
import { DestinationList } from './features/list/DestinationList.tsx';
import { PassportSelect } from './features/selector/PassportSelect.tsx';
import { GlobeStage } from './map/GlobeStage.tsx';
import { Legend } from './map/Legend.tsx';
import { useStore } from './state/store.ts';
import { useView } from './state/useView.ts';

export function App() {
  const status = useStore((s) => s.status);
  const error = useStore((s) => s.error);
  const base = useStore((s) => s.base);
  const init = useStore((s) => s.init);
  const passportA = useStore((s) => s.passportA);
  const passportB = useStore((s) => s.passportB);
  const comparing = useStore((s) => s.comparing);
  const fileErrors = useStore((s) => s.fileErrors);
  const setPassport = useStore((s) => s.setPassport);
  const retryPassport = useStore((s) => s.retryPassport);
  const selected = useStore((s) => s.selected);
  const view = useView();

  useEffect(() => void init(), [init]);

  if (status === 'error') {
    return (
      <main className="notice">
        <h1>PassportDiary</h1>
        <p>The visa data did not load. {error}</p>
        <button type="button" className="button" onClick={() => void init()}>
          Try again
        </button>
      </main>
    );
  }
  if (!base) {
    return (
      <main className="notice">
        <h1>PassportDiary</h1>
        <p role="status">Loading visa data…</p>
      </main>
    );
  }

  const selectedCountry = selected ? base.byId.get(selected) : undefined;
  const failed = [passportA, comparing ? passportB : null].find((c) => c && fileErrors[c]);
  const waiting = Boolean(passportA) && !view;

  return (
    <div className="app">
      <header className="header">
        <h1>PassportDiary</h1>
        <div className="controls">
          <PassportSelect
            label="Your passport"
            countries={base.countries}
            value={passportA}
            exclude={comparing ? passportB : null}
            onChange={(code) => setPassport('A', code)}
          />
          <CompareControls />
        </div>
      </header>

      <main className="stage">
        <div className="globe-area">
          <GlobeStage view={view} />
          {view && <Legend view={view} />}
        </div>

        <aside className="side">
          {failed ? (
            <div className="panel">
              <h2>That passport did not load</h2>
              <p>{fileErrors[failed]}</p>
              <button type="button" className="button" onClick={() => retryPassport(failed)}>
                Try again
              </button>
            </div>
          ) : selectedCountry ? (
            <CountryPanel country={selectedCountry} view={view} />
          ) : view ? (
            <DestinationList view={view} />
          ) : waiting ? (
            <p className="panel" role="status">
              Loading entry rules…
            </p>
          ) : (
            <div className="panel welcome">
              <h2>Where can your passport take you?</h2>
              <p>
                Choose your passport above. The globe then shows every country by what you need
                to enter: nothing, a visa at the border, an online form, or a visa from an
                embassy.
              </p>
            </div>
          )}
        </aside>
      </main>

      <Credits meta={base.meta} />
    </div>
  );
}
