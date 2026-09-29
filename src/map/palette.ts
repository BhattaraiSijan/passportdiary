import type { RequirementCategory } from '../data/schema.ts';
import type { Difference } from '../features/compare/compare.ts';

// The colours of the globe, and of every swatch that explains it. They are kept
// apart from the interface colours in styles.css.
//
// The scale runs from green (nothing to arrange) to red (a visa from an embassy),
// in slightly softened, printed tones. Hue alone is not relied on: visa on arrival
// and ETA are light, visa-free and eVisa are mid, visa required is dark and no
// admission darker still, so green and red also differ in lightness. The home
// country is white, which is outside the scale and stands out on blue water.
export const CATEGORY_COLORS: Record<RequirementCategory, string> = {
  citizen: '#ffffff',
  visa_free: '#35a36b',
  visa_on_arrival: '#b2dc74',
  eta: '#f4d655',
  evisa: '#e1802b',
  visa_required: '#c12c27',
  no_admission: '#3a1f24',
  unknown: '#c4c1b8',
};

// A darker ink of each colour, for type and lines on white (the stamp). Each has
// a contrast of at least 5.4 to 1 on white.
export const CATEGORY_INKS: Record<RequirementCategory, string> = {
  citizen: '#21509f',
  visa_free: '#1f7446',
  visa_on_arrival: '#47761c',
  eta: '#7a5a00',
  evisa: '#9a4f0b',
  visa_required: '#b02a22',
  no_admission: '#3a1f24',
  unknown: '#55514a',
};

// Compare mode, "where they differ". These are not steps of the scale above, so
// they use none of its colours, nor the blue of the water: violet, pink and a
// pale neutral, which also differ in lightness.
export const DIFFERENCE_COLORS: Record<Difference, string> = {
  a_better: '#47217d',
  b_better: '#ee7fb6',
  same: '#eeece6',
};

// The blue of the sea on a classroom globe, a little softened.
export const OCEAN = '#3a7cc2';
export const NO_DATA_LAND = CATEGORY_COLORS.unknown;

export const BORDER = { color: '#10264d', opacity: 0.5, width: 0.5 };
export const GRATICULE = { color: '#ffffff', opacity: 0.16, width: 0.6 };

// Outline of the hovered or selected country, and of the dots for tiny countries.
export const OUTLINE = '#ffffff';
export const MARKER_STROKE = '#10264d';

// Stripes over places where the sources disagree, as RGBA 0-255. A white line
// beside an ink line, so the stripes show on light and on dark colours alike.
type Rgba = [number, number, number, number];
export const HATCH_LIGHT: Rgba = [255, 255, 255, 235];
export const HATCH_DARK: Rgba = [16, 38, 77, 215];

// The globe on the start screen, before any passport is chosen: the emblem on
// the cover, green land on the same sea.
export const IDLE = {
  ocean: OCEAN,
  land: '#6ecb93',
  border: '#173c7c',
  borderOpacity: 0.7,
};
