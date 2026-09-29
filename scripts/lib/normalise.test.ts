import { describe, expect, it } from 'vitest';
import { applyOverride, normaliseCell, upstreamCellSchema } from './normalise.ts';

const cell = (c: object) => upstreamCellSchema.parse({ source: 'wikipedia', confidence: 'high', ...c });

describe('normaliseCell', () => {
  it.each([
    ['visa-free', 'visa_free'],
    ['visa-on-arrival', 'visa_on_arrival'],
    ['eta', 'eta'],
    ['e-visa', 'evisa'],
    ['visa-required', 'visa_required'],
    ['refused', 'no_admission'],
  ])('maps %s to %s', (type, category) => {
    expect(normaliseCell(cell({ type })).category).toBe(category);
  });

  it('maps freedom of movement to visa_free with a flag', () => {
    expect(normaliseCell(cell({ type: 'freedom-of-movement', days: null }))).toEqual({
      category: 'visa_free',
      freedomOfMovement: true,
      confidence: 'high',
      source: 'wikipedia',
    });
  });

  it('keeps stay days and check date', () => {
    const r = normaliseCell(cell({ type: 'visa-free', days: 30, checked: '2026-07-20' }));
    expect(r).toMatchObject({ maxStayDays: 30, checked: '2026-07-20' });
  });

  it('rejects an unknown upstream type instead of guessing', () => {
    expect(() => cell({ type: 'tourist-card' })).toThrow();
  });

  it('shows the most restrictive claim when sources disagree', () => {
    const r = normaliseCell(
      cell({
        type: 'e-visa',
        days: 30,
        confidence: 'disputed',
        dispute: { wikipedia: 'e-visa', 'passport-index': 'visa-required' },
      }),
    );
    expect(r.category).toBe('visa_required');
    expect(r.confidence).toBe('conflicting');
    expect(r.source).toBe('passport-index');
    // Days belong to the e-visa claim, not to the one shown.
    expect(r.maxStayDays).toBeUndefined();
    expect(r.claims).toEqual([
      { source: 'passport-index', category: 'visa_required' },
      { source: 'wikipedia', category: 'evisa', maxStayDays: 30 },
    ]);
  });

  it('fails on a disputed cell without claims', () => {
    expect(() => normaliseCell(cell({ type: 'eta', confidence: 'disputed' }))).toThrow();
  });
});

describe('applyOverride', () => {
  it('produces a sourced, high-confidence requirement', () => {
    const r = applyOverride({
      passport: 'NP',
      destination: 'KR',
      category: 'visa_required',
      date: '2026-09-29',
      reason: 'checked embassy site',
      sourceUrl: 'https://example.org/visa',
    });
    expect(r).toMatchObject({ category: 'visa_required', confidence: 'high', overridden: true });
    expect(r.sources?.[0]?.url).toBe('https://example.org/visa');
  });
});
