/**
 * Vote rules. Pure functions, no `req` - unit-testable without HTTP,
 * same pattern as KnowledgeWorkflow.js. One active vote per user+item;
 * value is always +1 or -1, there is no "0" row - removing a vote
 * deletes it entirely rather than storing a neutral one.
 */

export function isValidVoteValue(value) {
  return value === 1 || value === -1;
}

export function countFieldFor(value) {
  return value === 1 ? 'upvoteCount' : 'downvoteCount';
}
