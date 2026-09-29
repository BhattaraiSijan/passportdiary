import { z } from 'zod';
import {
  CATEGORIES,
  type Claim,
  type Override,
  type Requirement,
  type RequirementCategory,
} from '../../src/data/schema.ts';

// Schema of the upstream file. Drift upstream fails here with a clear message.
const upstreamType = z.enum([
  'visa-free',
  'freedom-of-movement',
  'eta',
  'visa-on-arrival',
  'e-visa',
  'visa-required',
  'refused',
]);
type UpstreamType = z.infer<typeof upstreamType>;

export const upstreamCellSchema = z.looseObject({
  type: upstreamType,
  days: z.number().int().positive().nullable().optional(),
  source: z.string().min(1),
  checked: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  confidence: z.enum(['high', 'medium', 'disputed']),
  dispute: z.record(z.string(), upstreamType).optional(),
  note: z.string().optional(),
});
export type UpstreamCell = z.infer<typeof upstreamCellSchema>;

export const upstreamFileSchema = z.looseObject({
  meta: z.looseObject({
    generated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    passports: z.array(z.string().regex(/^[A-Z]{2}$/)),
  }),
  matrix: z.record(z.string(), z.record(z.string(), upstreamCellSchema)),
});

const TYPE_TO_CATEGORY: Record<UpstreamType, RequirementCategory> = {
  'visa-free': 'visa_free',
  'freedom-of-movement': 'visa_free',
  'visa-on-arrival': 'visa_on_arrival',
  eta: 'eta',
  'e-visa': 'evisa',
  'visa-required': 'visa_required',
  refused: 'no_admission',
};

export function restrictiveness(category: RequirementCategory): number {
  return CATEGORIES.indexOf(category);
}

export function normaliseCell(cell: UpstreamCell): Requirement {
  const primary = TYPE_TO_CATEGORY[cell.type];
  const days = cell.days ?? undefined;
  const base = {
    source: cell.source,
    ...(cell.checked ? { checked: cell.checked } : {}),
    ...(cell.note ? { notes: cell.note } : {}),
  };

  if (cell.confidence !== 'disputed') {
    return {
      category: primary,
      ...(days ? { maxStayDays: days } : {}),
      ...(cell.type === 'freedom-of-movement' ? { freedomOfMovement: true } : {}),
      confidence: cell.confidence,
      ...base,
    };
  }

  if (!cell.dispute || Object.keys(cell.dispute).length < 2) {
    throw new Error('disputed cell without at least two claims');
  }
  // Upstream `type` and `days` belong to the primary source's claim.
  const claims: Claim[] = Object.entries(cell.dispute)
    .map(([source, type]) => ({
      source,
      category: TYPE_TO_CATEGORY[type],
      ...(days && type === cell.type ? { maxStayDays: days } : {}),
    }))
    .sort((a, b) => a.source.localeCompare(b.source));

  // Sources disagree: show the most restrictive claim so nobody is told they
  // need less paperwork than they might. The other claim stays visible.
  const shown = claims.reduce((worst, c) =>
    restrictiveness(c.category) > restrictiveness(worst.category) ? c : worst,
  );
  return {
    category: shown.category,
    ...(shown.maxStayDays ? { maxStayDays: shown.maxStayDays } : {}),
    confidence: 'conflicting',
    claims,
    ...base,
    source: shown.source,
  };
}

export function applyOverride(o: Override): Requirement {
  return {
    category: o.category,
    ...(o.maxStayDays ? { maxStayDays: o.maxStayDays } : {}),
    confidence: 'high',
    source: 'passportdiary-override',
    checked: o.date,
    ...(o.notes ? { notes: o.notes } : {}),
    sources: [{ label: 'Official source', url: o.sourceUrl }],
    overridden: true,
  };
}
