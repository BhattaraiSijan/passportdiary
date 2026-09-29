import type { RequirementCategory } from '../data/schema.ts';
import type { Difference } from '../features/compare/compare.ts';

// The colours of the globe, and of every swatch that explains it. They are kept
// apart from the interface colours in styles.css.
//
// The scale runs from green (nothing to arrange) to blue ink (a visa from an
// embassy), and each step also differs in lightness. It avoids red: a visa is
// paperwork, not a prohibition.
export const CATEGORY_COLORS: Record<RequirementCategory, string> = {
  citizen: '#10264d',
  visa_free: '#35a36b',
  visa_on_arrival: '#9adbb0',
  eta: '#f0d26b',
  evisa: '#8eb2ea',
  visa_required: '#2c5cb0',
  no_admission: '#4a4450',
  unknown: '#e3e0d8',
};

export const DIFFERENCE_COLORS: Record<Difference, string> = {
  a_better: '#2c5cb0',
  b_better: '#35a36b',
  same: '#c3cfe3',
};

export const OCEAN = '#d3e0f4';
export const NO_DATA_LAND = CATEGORY_COLORS.unknown;

export const BORDER = { color: '#10264d', opacity: 0.5, width: 0.5 };
export const GRATICULE = { color: '#2c5cb0', opacity: 0.22, width: 0.6 };

// Outline of the hovered or selected country, and of the dots for tiny countries.
export const OUTLINE = '#10264d';
export const MARKER_STROKE = '#10264d';

// Stripes over places where the sources disagree, as RGBA 0-255.
export const HATCH_COLOR: [number, number, number, number] = [255, 255, 255, 215];

// The globe on the start screen, before any passport is chosen: the emblem on
// the cover, green on deep blue.
export const IDLE = {
  ocean: '#173c7c',
  land: '#6ecb93',
  border: '#173c7c',
  borderOpacity: 0.7,
};
