import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useDesign } from './designs/design.ts';
import { Examples, Hint, Intro, KeyPreview, ShareBar, Summary, Switcher } from './designs/parts.tsx';
import { CompareControls } from './features/compare/CompareControls.tsx';
import { Credits } from './features/credits/Credits.tsx';
import { CountryPanel } from './features/detail/CountryPanel.tsx';
import { DestinationList } from './features/list/DestinationList.tsx';
import { PassportSelect } from './features/selector/PassportSelect.tsx';
import { GlobeStage } from './map/GlobeStage.tsx';
import { Legend } from './map/Legend.tsx';
import { useStore } from './state/store.ts';
import { useView } from './state/useView.ts';

const narrowQuery = window.matchMedia('(max-width: 820px)');
const watchNarrow = (listener: () => void) => {
  narrowQuery.addEventListener('change', listener);
  return () => narrowQuery.removeEventListener('change', listener);
};
// True on phones, where every design is one column and nothing is folded away.
const useNarrow = () => useSyncExternalStore(watchNarrow, () => narrowQuery.matches);

export function App() {
  const narrow = useNarrow();
  const design = useDesign();
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
  // Design 3 keeps the list folded under the globe until it is asked for.
  const [listOpen, setListOpen] = useState(false);

  useEffect(() => void init(), [init]);

  // In design 2 the detail opens beside the globe, which may have scrolled out of view.
  useEffect(() => {
    if (design === 2 && selected && !narrow) {
      const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' });
    }
  }, [design, selected, narrow]);

  if (status === 'error') {
    return (
      <main className="notice">
        <h1>PassportDiary</h1>
        <p>The visa data did not load. {error}</p>
        <button type="button" className="button" onClick={() => void init()}>
          Try again
        </button>
        <Switcher />
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
  const showSide = Boolean(failed || selectedCountry || passportA);

  const failure = failed ? (
    <div className="panel">
      <h2>That passport did not load</h2>
      <p>{fileErrors[failed]}</p>
      <button type="button" className="button" onClick={() => retryPassport(failed)}>
        Try again
      </button>
    </div>
  ) : null;
  const detail = selectedCountry ? <CountryPanel country={selectedCountry} view={view} /> : null;
  const list = view ? (
    <DestinationList view={view} />
  ) : (
    <p className="panel" role="status">
      Loading entry rules…
    </p>
  );

  const select = (
    <PassportSelect
      label="Your passport"
      placeholder={design !== 0 && !passportA ? 'Choose your passport' : undefined}
      countries={base.countries}
      value={passportA}
      exclude={comparing ? passportB : null}
      onChange={(code) => setPassport('A', code)}
    />
  );

  if (design === 0) {
    return (
      <div className="app">
        <header className="header">
          <h1>PassportDiary</h1>
          <div className={comparing ? 'controls' : 'controls controls-single'}>
            {select}
            <CompareControls />
          </div>
        </header>

        <main className={showSide ? 'stage has-side' : 'stage'}>
          <div className="globe-area">
            <GlobeStage view={view} sideOpen={showSide} />
            {view && <Legend view={view} />}
            {!showSide && (
              <div className="intro">
                <h2>Where can your passport take you?</h2>
                <p>
                  Choose your passport above. The globe then shows every country by what you need
                  to enter: nothing, a visa at the border, an online form, or a visa from an
                  embassy.
                </p>
              </div>
            )}
          </div>

          {/* The side panel only exists once it has something to show. */}
          {showSide && <aside className="side">{failure ?? detail ?? list}</aside>}
        </main>

        <Credits meta={base.meta} />
        <Switcher />
      </div>
    );
  }

  // The three directions share the start screen and differ in where the key,
  // the list and the detail live once a passport is chosen.
  const empty = !showSide;
  let surfaces: ReactNode = null;
  let below: ReactNode = null;

  if (!empty && design === 1) {
    // Two facing pages of equal size: what the colours mean, and where you can go.
    surfaces = (
      <>
        {view && (
          <section className="brief" data-frame="left" aria-label="Summary and key">
            <Summary view={view} />
            <Legend view={view} explain />
            <Hint />
          </section>
        )}
        <aside className={detail ? 'side has-detail' : 'side'} data-frame="right">
          {failure ?? detail ?? list}
        </aside>
      </>
    );
  }

  if (!empty && design === 2) {
    // One board under the globe: summary, key and list. A detail is pinned beside the globe.
    surfaces = detail && !failure && (
      <aside className="side detail-card" data-frame="right">
        {detail}
      </aside>
    );
    below = (
      <section className="board" aria-label="Summary, key and destinations">
        {failure}
        {!failure && view && (
          <div className="board-head">
            <Summary view={view} />
            <Hint />
            <ShareBar view={view} />
            <Legend view={view} />
          </div>
        )}
        {!failure && list}
      </section>
    );
  }

  if (!empty && design === 3) {
    // One dock under the globe. The key is always there; the list or a detail opens above it.
    const sheet = failure ?? detail ?? (listOpen || narrow ? list : null);
    surfaces = (
      <section className="dock" aria-label="Key and destinations">
        {sheet && (
          <aside
            className={detail ? 'side sheet has-detail' : 'side sheet'}
            data-frame-shift="bottom"
          >
            {sheet}
          </aside>
        )}
        {view && (
          <div className="dock-bar" data-frame="bottom">
            <div className="dock-top">
              <Summary view={view} />
              {!failure && !detail && (
                <button
                  type="button"
                  className="button dock-toggle"
                  aria-expanded={listOpen}
                  onClick={() => setListOpen(!listOpen)}
                >
                  {listOpen ? 'Hide the list' : 'Show all destinations'}
                </button>
              )}
            </div>
            <Legend view={view} />
            <Hint />
          </div>
        )}
      </section>
    );
  }

  const reframe = [
    design,
    empty,
    Boolean(view),
    comparing,
    compareMode,
    Boolean(detail),
    listOpen,
    Boolean(failure),
  ].join();

  return (
    <div className={empty ? 'app is-empty' : 'app'}>
      <header className="header" data-frame="top">
        <h1>PassportDiary</h1>
        {empty && <Intro />}
        <div className={comparing ? 'controls' : 'controls controls-single'}>
          {select}
          <CompareControls />
        </div>
        {empty && <Examples />}
      </header>

      <main className={empty ? 'stage' : 'stage has-side'}>
        <div className="globe-area" data-dome={empty && design === 3 ? '' : empty && design === 1 ? 'pad' : undefined}>
          <GlobeStage view={view} sideOpen={showSide} reframe={reframe} />
          {empty && <KeyPreview overGlobe={design === 3 || design === 1} />}
        </div>
        {surfaces}
        {below}
      </main>

      <Credits meta={base.meta} />
      <Switcher />
    </div>
  );
}
