import type { SkySpecification } from 'maplibre-gl';
import type { RequirementCategory } from '../data/schema.ts';
import type { Difference } from '../features/compare/compare.ts';
import {
  BORDER,
  CATEGORY_COLORS,
  DIFFERENCE_COLORS,
  NO_DATA_LAND,
  OCEAN,
} from '../map/colors.ts';
import { useDesign, type Design } from './design.ts';

// Everything the globe and the colour swatches need to know about a design.
export interface MapTheme {
  categories: Record<RequirementCategory, string>;
  differences: Record<Difference, string>;
  ocean: string;
  noData: string;
  border: string;
  borderOpacity: number;
  borderWidth: number;
  // Stripes over places where the sources disagree, as RGBA 0-255.
  hatch: [number, number, number, number];
  // Outline of the hovered or selected country, and of the dots for tiny countries.
  outline: string;
  markerStroke: string;
  graticule: { color: string; opacity: number } | null;
  sky: SkySpecification;
  // How much of the free space the globe fills.
  fill: number;
  // The globe on the start screen, before any passport is chosen.
  idle: { ocean: string; land: string; border: string; borderOpacity: number };
}

const current: MapTheme = {
  categories: CATEGORY_COLORS,
  differences: DIFFERENCE_COLORS,
  ocean: OCEAN,
  noData: NO_DATA_LAND,
  border: BORDER,
  borderOpacity: 0.55,
  borderWidth: 0.6,
  hatch: [22, 58, 117, 190],
  outline: '#ffffff',
  markerStroke: '#ffffff',
  graticule: null,
  sky: { 'atmosphere-blend': 0 },
  fill: 0.97,
  idle: { ocean: OCEAN, land: NO_DATA_LAND, border: BORDER, borderOpacity: 0.55 },
};

// 1. Visa page: a printed plate. Pale sea, ink lines, and a calm scale that runs
// from green (nothing to arrange) to blue ink (a visa from an embassy).
const visaPage: MapTheme = {
  categories: {
    citizen: '#10264d',
    visa_free: '#35a36b',
    visa_on_arrival: '#9adbb0',
    eta: '#f0d26b',
    evisa: '#8eb2ea',
    visa_required: '#2c5cb0',
    no_admission: '#4a4450',
    unknown: '#e3e0d8',
  },
  differences: { a_better: '#2c5cb0', b_better: '#35a36b', same: '#c3cfe3' },
  ocean: '#dbe6f6',
  noData: '#e3e0d8',
  border: '#10264d',
  borderOpacity: 0.5,
  borderWidth: 0.5,
  hatch: [255, 255, 255, 215],
  outline: '#10264d',
  markerStroke: '#10264d',
  graticule: { color: '#2c5cb0', opacity: 0.22 },
  sky: { 'atmosphere-blend': 0 },
  fill: 0.9,
  // The emblem on the cover: green foil on blue.
  idle: { ocean: '#173c7c', land: '#6ecb93', border: '#173c7c', borderOpacity: 0.7 },
};

// 2. Departures: a sign. Solid brand-blue sea, white country lines, and the
// familiar green to red reading, softened so it sits with the blue.
const departures: MapTheme = {
  categories: {
    citizen: '#ffffff',
    visa_free: '#58c98a',
    visa_on_arrival: '#b9ecae',
    eta: '#fbe58c',
    evisa: '#f5ae62',
    visa_required: '#e26a5a',
    no_admission: '#2b1f33',
    unknown: '#93a9d6',
  },
  differences: { a_better: '#fbe58c', b_better: '#58c98a', same: '#6f8fd0' },
  ocean: '#2554a4',
  noData: '#93a9d6',
  border: '#ffffff',
  borderOpacity: 0.85,
  borderWidth: 0.5,
  hatch: [18, 42, 94, 200],
  outline: '#0e2452',
  markerStroke: '#ffffff',
  graticule: null,
  sky: { 'atmosphere-blend': 0 },
  fill: 0.88,
  // Tone on tone, so the question and the field in front of it stay easy to read.
  idle: { ocean: '#1f4a94', land: '#3a6cc4', border: '#1f4a94', borderOpacity: 0.8 },
};

// 3. Night flight: the globe seen from above at night. The easier a country is
// to enter, the brighter it is lit; the rest stays dim but readable.
const nightFlight: MapTheme = {
  categories: {
    citizen: '#ffffff',
    visa_free: '#5fe0a0',
    visa_on_arrival: '#b4f0b8',
    eta: '#f6e58a',
    evisa: '#8fb6ff',
    visa_required: '#4d6db5',
    no_admission: '#0a1226',
    unknown: '#26406f',
  },
  differences: { a_better: '#f6e58a', b_better: '#5fe0a0', same: '#4d6db5' },
  ocean: '#14306a',
  noData: '#26406f',
  border: '#0b1c40',
  borderOpacity: 0.9,
  borderWidth: 0.6,
  hatch: [8, 20, 48, 200],
  outline: '#ffffff',
  markerStroke: '#0b1c40',
  graticule: { color: '#8fb6ff', opacity: 0.12 },
  sky: { 'atmosphere-blend': 0 },
  fill: 0.92,
  idle: { ocean: '#14306a', land: '#3b62ad', border: '#0b1c40', borderOpacity: 0.9 },
};

export const THEMES: Record<Design, MapTheme> = {
  0: current,
  1: visaPage,
  2: departures,
  3: nightFlight,
};

export const useTheme = (): MapTheme => THEMES[useDesign()];
