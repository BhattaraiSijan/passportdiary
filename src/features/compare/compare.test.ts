import { describe, expect, it } from 'vitest';
import type { PassportFile, Requirement } from '../../data/schema.ts';
import { better, buildCells, countByCategory, countByDifference, difference } from './compare.ts';

const req = (category: Requirement['category'], extra: Partial<Requirement> = {}): Requirement => ({
  category,
  confidence: 'high',
  source: 'wikipedia',
  ...extra,
});

const file = (passport: string, destinations: Record<string, Requirement>): PassportFile => ({
  schemaVersion: 1,
  passport,
  dataAsOf: '2026-07-20',
  license: 'CC BY-SA 4.0',
  attribution: 'test',
  destinations,
});

describe('better', () => {
  it('prefers the less restrictive requirement', () => {
    expect(better(req('visa_required'), req('evisa')).category).toBe('evisa');
    expect(better(req('visa_free'), req('visa_on_arrival')).category).toBe('visa_free');
  });

  it('ranks home country above everything', () => {
    expect(better(req('citizen'), req('visa_free')).category).toBe('citizen');
  });

  it('never prefers unknown', () => {
    expect(better(req('unknown'), req('no_admission')).category).toBe('no_admission');
  });

  it('breaks ties on the longer stay', () => {
    const b = req('visa_free', { maxStayDays: 90 });
    expect(better(req('visa_free', { maxStayDays: 30 }), b)).toBe(b);
  });
});

describe('difference', () => {
  it('classifies each destination', () => {
    expect(difference(req('visa_free'), req('evisa'))).toBe('a_better');
    expect(difference(req('visa_required'), req('eta'))).toBe('b_better');
    expect(difference(req('evisa'), req('evisa'))).toBe('same');
  });
});

describe('buildCells', () => {
  const a = file('NP', {
    NP: req('citizen'),
    IN: req('visa_free'),
    US: req('visa_required'),
    KR: req('visa_required', { confidence: 'conflicting' }),
  });
  const b = file('IN', {
    NP: req('visa_free'),
    IN: req('citizen'),
    US: req('visa_required'),
    KR: req('evisa'),
  });

  it('uses the single passport as is', () => {
    const cells = buildCells(a);
    expect(cells.get('KR')).toMatchObject({ category: 'visa_required', conflicting: true });
    expect(countByCategory(cells)).toMatchObject({ citizen: 1, visa_free: 1, visa_required: 2 });
  });

  it('shows the best of both passports', () => {
    const cells = buildCells(a, b);
    expect(cells.get('NP')?.category).toBe('citizen');
    expect(cells.get('IN')?.category).toBe('citizen');
    expect(cells.get('KR')).toMatchObject({ category: 'evisa', conflicting: false, difference: 'b_better' });
    expect(countByDifference(cells)).toEqual({ a_better: 1, b_better: 2, same: 1 });
  });

  it('counts add up to the number of destinations', () => {
    const counts = countByCategory(buildCells(a, b));
    expect(Object.values(counts).reduce((n, c) => n + c, 0)).toBe(4);
  });
});
