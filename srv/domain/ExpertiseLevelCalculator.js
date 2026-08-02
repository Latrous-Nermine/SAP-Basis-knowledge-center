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
