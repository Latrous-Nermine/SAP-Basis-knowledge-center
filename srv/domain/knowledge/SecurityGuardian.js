/**
 * AI Security Guardian seam (CLAUDE.md §5 decision C6). This project
 * decided a while ago to build this seam - not the real detector -
 * ahead of Knowledge Center content actually being submittable, and
 * never followed through: submitForReview() called nothing.
 *
 * The contract any real implementation must satisfy: an async
 * assess(text) returning { riskScore: 0-100, reasons: string[] }.
 * NoOpSecurityGuardian is what ships today - always risk 0 - so no
 * existing submission behavior changes. What's new is that the
 * decision-rule wiring (decisionForRiskScore, called from
 * submitForReview) is now real and exercised on every submission,
 * so a future real assessor is a one-file swap, not a new
 * integration into the workflow.
 */
export class NoOpSecurityGuardian {
  // eslint-disable-next-line no-unused-vars
  async assess(text) {
    return { riskScore: 0, reasons: [] };
  }
}

/** Spec §7.7 decision rule: 0-39 publish, 40-69 warn, 70-100 block. */
export function decisionForRiskScore(riskScore) {
  if (riskScore >= 70) return 'block';
  if (riskScore >= 40) return 'warn';
  return 'publish';
}
