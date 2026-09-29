import { useRef } from 'react';
import { formatDate } from '../../data/labels.ts';
import type { Meta } from '../../data/schema.ts';

export function Credits({ meta }: { meta: Meta }) {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <footer className="footer" data-frame="bottom">
      <p>
        Data as of {formatDate(meta.dataAsOf)}. Check official sources before you travel. Visa
        data:{' '}
        <a href={meta.upstream.url} target="_blank" rel="noreferrer">
          visa-matrix
        </a>{' '}
        and Wikipedia contributors,{' '}
        <a href={meta.licenseUrl} target="_blank" rel="noreferrer">
          {meta.license}
        </a>
        , modified.{' '}
        <button type="button" className="link" onClick={() => dialog.current?.showModal()}>
          Credits and licences
        </button>
      </p>

      <dialog ref={dialog} className="dialog" aria-labelledby="credits-title">
        <h2 id="credits-title">Credits and licences</h2>

        <h3>Visa requirements</h3>
        <p>
          From{' '}
          <a href={meta.upstream.url} target="_blank" rel="noreferrer">
            visa-matrix
          </a>{' '}
          (version {meta.upstream.commit.slice(0, 7)}), which is built from Wikipedia’s “Visa
          requirements for … citizens” pages and cross-checked against Passport Index. Licensed
          under{' '}
          <a href={meta.licenseUrl} target="_blank" rel="noreferrer">
            {meta.license}
          </a>
          .
        </p>
        <p>
          We changed the data: we converted it to our own format, and where the two sources
          disagree we show the stricter answer and list both. Our version of the data is shared
          under the same licence.
        </p>
        <p>
          The data covers {meta.passportCount} passports and was generated on{' '}
          {formatDate(meta.dataAsOf)}.
        </p>

        <h3>Map</h3>
        <p>
          Country shapes are made with{' '}
          <a href="https://www.naturalearthdata.com/" target="_blank" rel="noreferrer">
            Natural Earth
          </a>{' '}
          (public domain) and drawn with{' '}
          <a href="https://maplibre.org/" target="_blank" rel="noreferrer">
            MapLibre GL JS
          </a>
          . Borders are simplified and show who controls an area in practice. They do not express
          an opinion on the status of any territory.
        </p>

        <h3>No warranty</h3>
        <p>
          This is general information, not legal advice. Entry rules change often. Always check
          with the destination’s embassy or official website before you travel.
        </p>

        <form method="dialog">
          <button className="button">Close</button>
        </form>
      </dialog>
    </footer>
  );
}
