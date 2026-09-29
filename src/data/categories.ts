// Ordered from most permissive to most restrictive. The order is a documented
// judgement call (e.g. visa on arrival above ETA) used for conflicting claims
// and compare mode; change it here only.
export const CATEGORIES = [
  'citizen',
  'visa_free',
  'visa_on_arrival',
  'eta',
  'evisa',
  'visa_required',
  'no_admission',
  'unknown',
] as const;

export const SCHEMA_VERSION = 1;
