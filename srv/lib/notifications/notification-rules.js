/**
 * Notification business rules.
 *
 * This module is deliberately PURE:
 *   - no `import cds`
 *   - no database access
 *   - no knowledge of HTTP, requests or responses
 *
 * That means every function here can be unit-tested in
 * milliseconds without starting a server or a database.
 * Anything that needs `req` or `SELECT` belongs in the
 * service handler, not here.
 */

export const NOTIFICATION_TYPES = [
  'COMMENT',
  'MENTION',
  'ANSWER_ACCEPTED',
  'ARTICLE_PUBLISHED',
  'DOC_PUBLISHED',
  'ROOM_POST',
  'BADGE_EARNED',
  'CERTIFICATION_COMPLETED',
  'RECOMMENDATION',
  'VALIDATION_REQUESTED',
  'VALIDATION_RESULT',
  'UPDATE_REMINDER',
  'SECURITY_EVENT',
];

export const NOTIFICATION_SOURCES = [
  'POST', 'COMMENT', 'ROOM', 'BADGE', 'CERTIFICATION', 'USER', 'SYSTEM',
];

/** Types that should stand out in the UI. Everything else is INFO. */
const SEVERITY_BY_TYPE = {
  SECURITY_EVENT: 'CRITICAL',
  VALIDATION_REQUESTED: 'WARNING',
  UPDATE_REMINDER: 'WARNING',
};

export function isValidType(type) {
  return NOTIFICATION_TYPES.includes(type);
}

export function isValidSource(source) {
  return source == null || NOTIFICATION_SOURCES.includes(source);
}

/**
 * Severity is DERIVED from the type, never supplied by the caller.
 * If callers could set it, every lot would pick its own convention
 * and the UI would be inconsistent within a week.
 */
export function severityFor(type) {
  return SEVERITY_BY_TYPE[type] ?? 'INFO';
}

/**
 * Accepts an object or a JSON string, always returns a JSON string
 * (or null). Rejects anything that is not valid JSON, so a malformed
 * payload fails at write time — where the bug is — instead of at read
 * time, three days later, in someone else's screen.
 */
export function serializeParams(params) {
  if (params === null || params === undefined || params === '') return null;

  if (typeof params === 'object') return JSON.stringify(params);

  if (typeof params === 'string') {
    JSON.parse(params);   // throws if invalid — that is the point
    return params;
  }

  throw new Error('params must be a JSON object or a JSON string');
}

/**
 * Validates an incoming emit() payload.
 * Returns a list of human-readable problems — empty means valid.
 * Returning a list instead of throwing lets the caller report every
 * problem at once rather than one per round-trip.
 */
export function validateEmitPayload({ recipientID, type, sourceType, params }) {
  const errors = [];

  if (!recipientID || typeof recipientID !== 'string') {
    errors.push('recipientID is required');
  }
  if (!isValidType(type)) {
    errors.push(`type must be one of: ${NOTIFICATION_TYPES.join(', ')}`);
  }
  if (!isValidSource(sourceType)) {
    errors.push(`sourceType must be one of: ${NOTIFICATION_SOURCES.join(', ')}`);
  }
  try {
    serializeParams(params);
  } catch {
    errors.push('params must be valid JSON');
  }

  return errors;
}