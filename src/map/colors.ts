import type { RequirementCategory } from '../data/schema.ts';
import type { Difference } from '../features/compare/compare.ts';

// Map palette, separate from the interface colours in styles.css so the
// categories stay distinguishable on the blue ocean.
export const CATEGORY_COLORS: Record<RequirementCategory, string> = {
  citizen: '#ffffff',
  visa_free: '#35b56f',
  visa_on_arrival: '#a9de6c',
  eta: '#f6d860',
  evisa: '#f4a04d',
  visa_required: '#e2574c',
  no_admission: '#2a2c38',
  unknown: '#8fa5cc',
};

export const DIFFERENCE_COLORS: Record<Difference, string> = {
  a_better: '#f6d860',
  b_better: '#6fcf8e',
  same: '#5f7db5',
};

export const OCEAN = '#2a62b8';
export const NO_DATA_LAND = CATEGORY_COLORS.unknown;
export const BORDER = '#163a75';
