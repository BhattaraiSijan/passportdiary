import { describe, expect, it } from 'vitest';
import { colorExpression, opacityExpression } from './layers.ts';

describe('colorExpression', () => {
  it('groups codes by colour', () => {
    const expression = colorExpression(
      new Map([
        ['IN', '#0f0'],
        ['US', '#f00'],
        ['BT', '#0f0'],
      ]),
      '#999',
    );
    expect(expression).toEqual([
      'match',
      ['coalesce', ['get', 'code'], ''],
      ['BT', 'IN'],
      '#0f0',
      ['US'],
      '#f00',
      '#999',
    ]);
  });

  it('falls back to a plain colour when there is no data', () => {
    expect(colorExpression(new Map(), '#999')).toBe('#999');
  });
});

describe('opacityExpression', () => {
  it('is fully opaque without a filter', () => {
    expect(opacityExpression(null)).toBe(1);
  });

  it('fades everything outside the filter', () => {
    expect(opacityExpression(['US'])).toEqual([
      'case',
      ['in', ['coalesce', ['get', 'code'], ''], ['literal', ['US']]],
      1,
      0.18,
    ]);
  });
});
