import cds from '@sap/cds';

/**
 * Contract A facade (CLAUDE.md §6 "Facade" pattern) - the single way
 * any Lot 2 workflow raises a notification. Every call site used to
 * hand-roll this same cds.spawn+connect+send sequence (see
 * knowledge-service.js's original approveContribution); centralised
 * here so there is exactly one place that knows HOW a notification
 * gets raised, and every caller only says WHAT happened.
 *
 * Deliberately fire-and-forget in a DETACHED, privileged transaction
 * (cds.spawn), not the caller's own open request transaction:
 *   - NotificationService#raise requires ['internal-user','Administrator']
 *     (notification-service.cds) - a plain cds.connect.to()+.send() would
 *     propagate the REAL caller (e.g. a Manager), which raise() correctly
 *     rejects. cds.spawn({ user: cds.User.privileged }, ...) is CAP's
 *     documented mechanism for running as that elevated identity instead.
 *   - cds.tx() would nest inside the caller's own already-open
 *     transaction and deadlock SQLite's single writer (found the hard
 *     way, see the original comment this replaces) - cds.spawn is a
 *     genuinely separate, detached transaction.
 *   - Being detached also means a caller's already-committed decision
 *     (an approval, a status change) can never be undone by a
 *     notification hiccup. The failure is still logged, never silently
 *     swallowed (CLAUDE.md §10).
 *
 * Callers must invoke this LAST, after every write that could still
 * fail has already succeeded - the notification cannot be rolled back
 * once fired.
 *
 * @param {string} recipientID
 * @param {string} type        - one of NOTIFICATION_TYPES (notification-rules.js)
 * @param {object} [opts]
 * @param {string} [opts.sourceType] - one of NOTIFICATION_SOURCES (notification-rules.js)
 * @param {string} [opts.sourceId]
 * @param {object} [opts.params]     - plain object; raise() serialises it to JSON
 */
export function notify(recipientID, type, opts = {}) {
  const { sourceType, sourceId, params } = opts;

  cds.spawn({ user: cds.User.privileged }, async (tx) => {
    const notificationService = await cds.connect.to('NotificationService');
    await notificationService.tx(tx).send('raise', {
      recipientID,
      type,
      sourceType: sourceType ?? null,
      sourceId: sourceId ?? null,
      params: params ? JSON.stringify(params) : null,
    });
  }).on('failed', (err) => {
    console.error(`Failed to raise notification (${type} -> ${recipientID}):`, err);
  });
}

/** Same as notify(), for the (rare) case a single event has more than
    one recipient - e.g. every Manager when content is submitted for
    review, every member of a room when someone posts in it. Dedupes,
    so a recipient who appears twice never gets two rows. */
export function notifyMany(recipientIDs, type, opts = {}) {
  for (const recipientID of new Set(recipientIDs)) {
    notify(recipientID, type, opts);
  }
}
