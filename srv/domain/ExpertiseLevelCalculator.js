/**
 * Score -> expertise level thresholds, exactly as specified in the design
 * (docs/design/Profile.md). Computed server-side only: the design computes
 * this in the browser, which would let a user edit their own level in
 * devtools - cosmetic here, but it's the exact habit that causes real
 * vulnerabilities elsewhere.
 */
const THRESHOLDS = [
  { min: 1500, level: 'Master' },
  { min: 1000, level: 'Spécialiste' },
  { min: 600,  level: 'Expert' },
  { min: 250,  level: 'Contributeur' },
  { min: 0,    level: 'Débutant' },
];

export function calculateLevel(totalScore) {
  const score = totalScore || 0;
  return (THRESHOLDS.find((t) => score >= t.min) || THRESHOLDS[THRESHOLDS.length - 1]).level;
}

/**
 * Inverse of calculateLevel(), for the Experts "expertise level" filter.
 * expertiseLevel is computed after READ, not a stored column, so it can't
 * appear directly in a $filter - PeopleService rewrites
 * `expertiseLevel eq 'Expert'` into this range against `reputation`
 * before the query runs. Returns null for an unrecognised level so the
 * caller can reject the filter instead of silently matching everything.
 */
export function levelToReputationRange(level) {
  const index = THRESHOLDS.findIndex((t) => t.level === level);
  if (index === -1) return null;

  const min = THRESHOLDS[index].min;
  const max = index > 0 ? THRESHOLDS[index - 1].min : null; // null = no upper bound (Master)
  return { min, max };
}
