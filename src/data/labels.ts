import type { Confidence, RequirementCategory } from './schema.ts';

// All user-facing strings for the data live here so they can be translated later.
export const CATEGORY_LABELS: Record<RequirementCategory, string> = {
  citizen: 'Home country',
  visa_free: 'Visa-free',
  visa_on_arrival: 'Visa on arrival',
  eta: 'Travel authorisation (ETA)',
  evisa: 'eVisa',
  visa_required: 'Visa required',
  no_admission: 'No admission',
  unknown: 'No data',
};

export const CATEGORY_HELP: Record<RequirementCategory, string> = {
  citizen: 'This is the country that issued the passport.',
  visa_free: 'You can enter without a visa.',
  visa_on_arrival: 'You get the visa at the border when you arrive.',
  eta: 'You register online before you travel. It is usually quick and approved automatically.',
  evisa: 'You apply for a visa online before you travel.',
  visa_required: 'You apply for a visa at an embassy or consulate before you travel.',
  no_admission: 'Holders of this passport are refused entry.',
  unknown: 'We have no entry rules for this place.',
};

// One short line per category, for keys where space is tight.
export const CATEGORY_SHORT_HELP: Record<RequirementCategory, string> = {
  citizen: 'The country that issued the passport',
  visa_free: 'Enter without a visa',
  visa_on_arrival: 'Get the visa at the border',
  eta: 'A quick online form before you travel',
  evisa: 'Apply online before you travel',
  visa_required: 'Apply at an embassy before you travel',
  no_admission: 'Entry is refused',
  unknown: 'We have no entry rules for this place',
};

export const CONFIDENCE_LABELS: Record<Confidence, string> = {
  high: 'Two sources agree',
  medium: 'One source only',
  conflicting: 'Sources disagree',
};

export const SOURCE_LABELS: Record<string, string> = {
  wikipedia: 'Wikipedia',
  'passport-index': 'Passport Index',
  'passportdiary-override': 'PassportDiary correction',
};

export const sourceLabel = (source: string) => SOURCE_LABELS[source] ?? source;

export function formatStay(days: number | undefined): string | null {
  if (!days) return null;
  return days === 1 ? '1 day' : `${days} days`;
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'UTC' }).format(
    new Date(`${iso}T00:00:00Z`),
  );
}
