import { useEffect } from 'react';
import { CompareControls } from './features/compare/CompareControls.tsx';
import { Credits } from './features/credits/Credits.tsx';
import { CountryPanel } from './features/detail/CountryPanel.tsx';
import { Hint } from './features/hints/Hint.tsx';
import { DestinationList } from './features/list/DestinationList.tsx';
import { PassportSelect } from './features/selector/PassportSelect.tsx';
import { Examples, Intro, KeyPreview } from './features/start/Start.tsx';
import { Summary } from './features/summary/Summary.tsx';
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
  const compareMode = useStore((s) => s.compareMode);
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
  // The start screen shows until there is something to put on the pages.
  const started = Boolean(failed || selectedCountry || passportA);

  // The globe is framed again whenever one of these changes what lies over it.
  const reframe = [started, Boolean(view), comparing, compareMode].join();

  return (
    <div className={started ? 'app' : 'app is-empty'}>
      <header className="header" data-frame="top">
        <h1>PassportDiary</h1>
        {!started && <Intro />}
        <div className={comparing ? 'controls' : 'controls controls-single'}>
          <PassportSelect
            label="Your passport"
            placeholder={passportA ? undefined : 'Choose your passport'}
            countries={base.countries}
            value={passportA}
            exclude={comparing ? passportB : null}
            onChange={(code) => setPassport('A', code)}
          />
          <CompareControls />
        </div>
        {!started && <Examples />}
      </header>

      <main className="stage">
        <div className="globe-area">
          <GlobeStage view={view} started={started} reframe={reframe} />
          {!started && <KeyPreview />}
        </div>

        {/* The two pages only exist once they have something to show. */}
        {started && view && (
          <section className="brief" data-frame="left" aria-label="Summary and key">
            <Summary view={view} />
            <Legend view={view} />
            <Hint />
          </section>
        )}
        {started && (
          <aside className={selectedCountry ? 'side has-detail' : 'side'} data-frame="right">
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
            ) : (
              <p className="panel" role="status">
                Loading entry rules…
              </p>
            )}
          </aside>
        )}
      </main>

      <Credits meta={base.meta} />
    </div>
  );
}
