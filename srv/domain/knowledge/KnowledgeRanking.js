/**
 * The three sort modes the Knowledge Centre exposes, and what each one
 * means - decided once, here, not built ad-hoc wherever a query happens
 * to be constructed. Recency is only ever a tiebreaker, never a decay
 * factor: this is a knowledge base, not a social feed - a genuinely
 * good, still-accurate article shouldn't lose visibility just for
 * having existed longer.
 *
 * netScore (upvoteCount - downvoteCount) is a real stored column, not a
 * computed expression - see db/lot2.cds's comment on KnowledgeItems for
 * why (OData $orderby has no expression syntax, and sorting by the two
 * raw counters as separate keys is not equivalent to sorting by their
 * difference).
 */

const SORT_MODES = {
  relevant: [{ ref: ['netScore'] , sort: 'desc' }, { ref: ['publishedAt'], sort: 'desc' }],
  upvoted:  [{ ref: ['netScore'] , sort: 'desc' }],
  recent:   [{ ref: ['publishedAt'], sort: 'desc' }],
};

export function orderByFor(sortKey) {
  return SORT_MODES[sortKey] || SORT_MODES.relevant;
}
