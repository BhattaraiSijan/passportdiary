import { useStore } from '../../state/store.ts';
import type { View } from '../../state/useView.ts';
import { countByCategory, countByDifference } from '../compare/compare.ts';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// The headline numbers for the chosen passport or pair of passports.
export function Summary({ view }: { view: View }) {
  const base = useStore((s) => s.base)!;
  const compareMode = useStore((s) => s.compareMode);
  const nameA = base.byId.get(view.fileA.passport)?.name ?? view.fileA.passport;
  const nameB = view.fileB ? (base.byId.get(view.fileB.passport)?.name ?? '') : '';

  let figure: string;
  let text: string;
  if (view.comparing && compareMode === 'difference') {
    const counts = countByDifference(view.cells);
    const [name, count] =
      counts.b_better >= counts.a_better ? [nameB, counts.b_better] : [nameA, counts.a_better];
    const [other, otherCount] =
      counts.b_better >= counts.a_better ? [nameA, counts.a_better] : [nameB, counts.b_better];
    figure = String(count);
    text = `${count === 1 ? 'destination is' : 'destinations are'} easier with ${name}, and ${otherCount} with ${other}. ${counts.same} are the same for both.`;
  } else {
    const counts = countByCategory(view.cells);
    const ready = counts.visa_free + counts.visa_on_arrival;
    const online = counts.eta + counts.evisa;
    const total = ready + online + counts.visa_required + counts.no_admission;
    figure = String(ready);
    text = `of ${plural(total, 'destination', 'destinations')} need nothing arranged before you travel${
      view.comparing ? ', using whichever passport is easier' : ''
    }. ${online} more can be arranged online.`;
  }

  return (
    <div className="summary">
      <h2>
        <span className="role">{view.comparing ? 'Passports' : 'Passport'}</span>
        {view.comparing ? `${nameA} and ${nameB}` : nameA}
      </h2>
      <p>
        <strong className="figure">{figure}</strong> {text}
      </p>
    </div>
  );
}
