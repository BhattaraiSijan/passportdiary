import { z } from 'zod';
// The app only ever sees this normalised contract, never an upstream format.
// The app imports types from here with `import type`, so zod stays out of the bundle.
// Bump SCHEMA_VERSION on any breaking change to the emitted files.
import { CATEGORIES, SCHEMA_VERSION } from './categories.ts';

export { CATEGORIES, SCHEMA_VERSION };

export const categorySchema = z.enum(CATEGORIES);
export type RequirementCategory = z.infer<typeof categorySchema>;

export const confidenceSchema = z.enum(['high', 'medium', 'conflicting']);
export type Confidence = z.infer<typeof confidenceSchema>;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const countryCode = z.string().regex(/^[A-Z]{2}$/);

export const claimSchema = z.strictObject({
  source: z.string().min(1),
  category: categorySchema,
  maxStayDays: z.number().int().positive().optional(),
});
export type Claim = z.infer<typeof claimSchema>;

export const sourceLinkSchema = z.strictObject({
  label: z.string().min(1),
  url: z.url(),
});

export const requirementSchema = z
  .strictObject({
    category: categorySchema,
    maxStayDays: z.number().int().positive().optional(),
    freedomOfMovement: z.boolean().optional(),
    confidence: confidenceSchema,
    // Present when sources disagree. `category` is then the most restrictive claim.
    claims: z.array(claimSchema).min(2).optional(),
    source: z.string().min(1),
    checked: isoDate.optional(),
    notes: z.string().optional(),
    sources: z.array(sourceLinkSchema).optional(),
    overridden: z.boolean().optional(),
  })
  .refine((r) => (r.confidence === 'conflicting') === (r.claims !== undefined), {
    message: 'claims must be present exactly when confidence is conflicting',
  });
export type Requirement = z.infer<typeof requirementSchema>;

export const passportFileSchema = z.strictObject({
  schemaVersion: z.literal(SCHEMA_VERSION),
  passport: countryCode,
  dataAsOf: isoDate,
  license: z.string(),
  attribution: z.string(),
  destinations: z.record(countryCode, requirementSchema),
});
export type PassportFile = z.infer<typeof passportFileSchema>;

export const countryKindSchema = z.enum(['state', 'territory', 'disputed_area', 'no_data']);
export type CountryKind = z.infer<typeof countryKindSchema>;

export const countrySchema = z.strictObject({
  // Unique id of the map shape: ISO alpha-2 where one exists, else Natural Earth's ADM0_A3.
  id: z.string().regex(/^[A-Z]{2,3}$/),
  name: z.string().min(1),
  kind: countryKindSchema,
  // Both true exactly for the entries that exist in the visa dataset.
  isPassport: z.boolean(),
  isDestination: z.boolean(),
  // Administering or claimed-by state. Entry rules are NOT inherited from it.
  parent: countryCode.optional(),
  centroid: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
  // Too small to see or tap on the globe at low zoom: rendered as a marker too.
  isTiny: z.boolean(),
});
export type Country = z.infer<typeof countrySchema>;

export const countriesFileSchema = z.strictObject({
  schemaVersion: z.literal(SCHEMA_VERSION),
  countries: z.array(countrySchema),
});
export type CountriesFile = z.infer<typeof countriesFileSchema>;

export const metaSchema = z.strictObject({
  schemaVersion: z.literal(SCHEMA_VERSION),
  datasetVersion: z.string().min(1),
  dataAsOf: isoDate,
  passportCount: z.number().int().positive(),
  cellCount: z.number().int().positive(),
  license: z.string(),
  licenseUrl: z.url(),
  attribution: z.string(),
  upstream: z.strictObject({
    name: z.string(),
    url: z.url(),
    commit: z.string().regex(/^[0-9a-f]{40}$/),
    sha256: z.string().regex(/^[0-9a-f]{64}$/),
  }),
  overrideCount: z.number().int().nonnegative(),
});
export type Meta = z.infer<typeof metaSchema>;

export const overrideSchema = z.strictObject({
  passport: countryCode,
  destination: countryCode,
  category: categorySchema.exclude(['citizen', 'unknown']),
  maxStayDays: z.number().int().positive().optional(),
  notes: z.string().optional(),
  date: isoDate,
  reason: z.string().min(1),
  sourceUrl: z.url(),
});
export const overridesFileSchema = z.array(overrideSchema);
export type Override = z.infer<typeof overrideSchema>;
