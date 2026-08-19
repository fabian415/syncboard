// Fixed presentation order for per-member sections (Showcase outline, slide
// decks, etc). Names not in this list sort after everyone listed here,
// keeping their relative original order.
export const MEMBER_PRESENTATION_ORDER = [
  'Sephiroth',
  'Alex',
  'TungYi',
  'Scott',
  'Rafael',
  'Jim',
  'Iris',
  'WunHuei',
  'Fabian',
];

const RANK_BY_NAME = new Map(MEMBER_PRESENTATION_ORDER.map((name, index) => [name, index]));

export function memberPresentationRank(name) {
  return RANK_BY_NAME.has(name) ? RANK_BY_NAME.get(name) : Infinity;
}
