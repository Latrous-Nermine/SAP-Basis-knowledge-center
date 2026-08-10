/**
 * Makes every contains(...) OData filter case-insensitive by wrapping
 * both of its operands in tolower(...) before the query runs.
 *
 * Root cause this fixes: CAP's contains() compiles to a case-SENSITIVE
 * comparison on this project's SQLite backend (confirmed live -
 * contains(title,'SAP') and contains(title,'sap') return different
 * result counts) - and HANA's default collation is case-sensitive too,
 * so this isn't a SQLite-only quirk masked in production. Rewriting the
 * query is the correct layer: the frontend never sees or controls
 * collation, and a client-side workaround (lower-casing the typed search
 * term) would only fix half the comparison - the stored data is still
 * mixed-case.
 *
 * Walks the whole CQN where-tree generically, not just the top level, so
 * it also reaches a contains() nested inside an any() lambda condition
 * (Experts' skill search: skills/any(s:contains(s/skillName,'...'))) or
 * inside a parenthesised xpr (multiple combined filters) - both shapes
 * this app's own List/Filter bindings actually produce.
 */
function lowerContainsCalls(node) {
  if (Array.isArray(node)) {
    node.forEach(lowerContainsCalls);
    return;
  }
  if (!node || typeof node !== 'object') return;

  if (node.func === 'contains' && Array.isArray(node.args) && node.args.length === 2) {
    node.args = node.args.map((arg) => ({ func: 'tolower', args: [arg] }));
  }

  for (const key of Object.keys(node)) {
    lowerContainsCalls(node[key]);
  }
}

export function makeSearchCaseInsensitive(query) {
  const where = query?.SELECT?.where;
  if (where) lowerContainsCalls(where);
}
