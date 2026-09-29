import { useEffect, useRef, type CSSProperties } from 'react';
import {
  CATEGORY_HELP,
  CATEGORY_LABELS,
  CONFIDENCE_LABELS,
  formatDate,
  formatStay,
  sourceLabel,
} from '../../data/labels.ts';
import type { Country, Requirement } from '../../data/schema.ts';
import { CATEGORY_COLORS, CATEGORY_INKS } from '../../map/palette.ts';
import { useStore } from '../../state/store.ts';
import type { View } from '../../state/useView.ts';

const wikipediaSearch = (passportName: string) =>
  `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(
    `Visa requirements for ${passportName} citizens`,
  )}`;

function RequirementCard({
  passport,
  requirement,
}: {
  passport: Country;
  requirement: Requirement;
}) {
  const stay = formatStay(requirement.maxStayDays);
  const hasRule = requirement.category !== 'citizen' && requirement.category !== 'unknown';
  return (
    <article
      className="requirement"
      // The answer is stamped in the ink of its colour.
      style={{ '--stamp': CATEGORY_INKS[requirement.category] } as CSSProperties}
    >
      <h3>
        With a passport from <strong>{passport.name}</strong>
      </h3>
      <p className="verdict">
        <span className="swatch" style={{ background: CATEGORY_COLORS[requirement.category] }} />
        {CATEGORY_LABELS[requirement.category]}
      </p>
      <p>{CATEGORY_HELP[requirement.category]}</p>

      {hasRule && (
        <dl>
          {stay && (
            <>
              <dt>Stay up to</dt>
              <dd>{stay}</dd>
            </>
          )}
          {requirement.freedomOfMovement && (
            <>
              <dt>Free movement</dt>
              <dd>No fixed limit on how long you can stay.</dd>
            </>
          )}
          <dt>How sure is this</dt>
          <dd>{CONFIDENCE_LABELS[requirement.confidence]}</dd>
          {requirement.checked && (
            <>
              <dt>Last checked</dt>
              <dd>{formatDate(requirement.checked)}</dd>
            </>
          )}
          {requirement.notes && (
            <>
              <dt>Notes</dt>
              <dd>{requirement.notes}</dd>
            </>
          )}
        </dl>
      )}

      {requirement.claims && (
        <div className="claims">
          <p>
            Our sources disagree here. We show the stricter answer so you are not caught out.
          </p>
          <ul>
            {requirement.claims.map((claim) => (
              <li key={claim.source}>
                {sourceLabel(claim.source)}: {CATEGORY_LABELS[claim.category]}
                {claim.maxStayDays ? `, ${formatStay(claim.maxStayDays)}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasRule && (
        <ul className="links">
          {requirement.sources?.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.label}
              </a>
            </li>
          ))}
          <li>
            <a href={wikipediaSearch(passport.name)} target="_blank" rel="noreferrer">
              Find the Wikipedia page for {passport.name} passport holders
            </a>
          </li>
        </ul>
      )}
    </article>
  );
}

export function CountryPanel({ country, view }: { country: Country; view: View | null }) {
  const base = useStore((s) => s.base)!;
  const select = useStore((s) => s.select);
  const heading = useRef<HTMLHeadingElement>(null);

  // Move focus to the panel so keyboard and screen reader users land on the new content.
  useEffect(() => heading.current?.focus(), [country.id]);

  const cell = view?.cells.get(country.id);
  const parent = country.parent ? base.byId.get(country.parent) : undefined;
  const passportA = view ? base.byId.get(view.fileA.passport) : undefined;
  const passportB = view?.fileB ? base.byId.get(view.fileB.passport) : undefined;

  return (
    <section className="panel" aria-labelledby="panel-title">
      <button type="button" className="button button-quiet" onClick={() => select(null)}>
        Back to all destinations
      </button>
      {/* The journey: which passport, to which country. */}
      <div className="route">
        {passportA && (
          <p className="route-stop">
            <span className="role">{passportB ? 'Passports' : 'Passport'}</span>
            <span className="route-name">
              {passportB ? `${passportA.name} or ${passportB.name}` : passportA.name}
            </span>
          </p>
        )}
        <div className="route-stop route-end">
          <span className="role">Destination</span>
          <h2 id="panel-title" className="route-name" ref={heading} tabIndex={-1}>
            {country.name}
          </h2>
        </div>
      </div>

      {!country.isDestination && (
        <p>
          We have no entry rules for {country.name}.
          {parent &&
            (country.kind === 'disputed_area'
              ? ` It is claimed by ${parent.name}, but entry is controlled locally and the rules can differ.`
              : ` It is administered by ${parent.name}, but its entry rules can differ.`)}
        </p>
      )}

      {country.isDestination && !view && <p>Choose a passport to see the entry rules.</p>}

      {cell && passportA && <RequirementCard passport={passportA} requirement={cell.a} />}
      {cell?.b && passportB && <RequirementCard passport={passportB} requirement={cell.b} />}

      {cell && (
        <p className="caution">
          Rules change, and they can depend on why you travel and how you arrive. Check with the
          embassy or official website of {country.name} before you book.
        </p>
      )}
    </section>
  );
}
