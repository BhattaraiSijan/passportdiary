import type { ExpressionSpecification } from 'maplibre-gl';

const CODE: ExpressionSpecification = ['coalesce', ['get', 'code'], ''];

// One `match` branch per colour, so the expression stays small however many countries there are.
export function colorExpression(
  colorByCode: ReadonlyMap<string, string>,
  fallback: string,
): ExpressionSpecification | string {
  const codesByColor = new Map<string, string[]>();
  for (const [code, color] of colorByCode) {
    const codes = codesByColor.get(color);
    if (codes) codes.push(code);
    else codesByColor.set(color, [code]);
  }
  if (codesByColor.size === 0) return fallback;
  const branches = [...codesByColor].flatMap(([color, codes]) => [codes.sort(), color]);
  return ['match', CODE, ...branches, fallback] as unknown as ExpressionSpecification;
}

export function memberExpression(codes: readonly string[]): ExpressionSpecification {
  return ['in', CODE, ['literal', [...codes].sort()]];
}

// Full opacity for highlighted codes, faded for the rest. `null` highlights everything.
export function opacityExpression(
  highlighted: readonly string[] | null,
  faded = 0.18,
): ExpressionSpecification | number {
  if (highlighted === null) return 1;
  return ['case', memberExpression(highlighted), 1, faded];
}
