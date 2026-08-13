using { aymax.knowledgehub as kh } from '../db/lot2';

/**
 * ============================================================
 *  NotificationService  —  LOT 2
 * ============================================================
 *  Exposed at  /odata/v4/notification
 *
 *  Consumed by:
 *    - the Fiori shell bell  (unreadCount, top 5)
 *    - the Notifications page (list, markRead, markAllRead)
 *    - EVERY other lot, through `raise` (Contract A)
 * ============================================================
 */
@path    : '/odata/v4/notification'
@requires: 'authenticated-user'
service NotificationService {

  /**
   * The inbox.
   *
   * @readonly + actions, rather than a writable entity, on purpose:
   * if clients could PATCH this entity they could also rewrite
   * `type`, `params` or `createdAt`. The only legitimate mutation
   * is "mark as read", so that is the only mutation exposed —
   * as an action, with its own rules.
   *
   * The @restrict `where` clause is compiled INTO the SQL by CAP.
   * A user cannot read someone else's inbox even by editing the
   * URL by hand. This is enforced by the framework, not by us
   * remembering to add a filter in every handler.
   */
  @readonly
  @restrict: [
    { grant: 'READ', where: 'recipient_userID = $user.id' }
  ]
  entity Notifications as projection on kh.Notifications;


  /** Badge count for the shell bell. GET /unreadCount() */
  function unreadCount() returns Integer;

  /** Mark one notification read. Returns false if it was not yours
      or was already read. */
  action markRead(notificationID : UUID) returns Boolean;

  /** "Tout marquer comme lu". Returns how many rows changed. */
  action markAllRead() returns Integer;


  /**
   * CONTRACT A — the entry point every other lot calls.
   *
   *   Preferred (in-process, same transaction, no network):
   *     const notify = await cds.connect.to('NotificationService');
   *     await notify.send('raise', {
   *       recipientID: post.author_userID,
   *       type: 'COMMENT',
   *       sourceType: 'POST',
   *       sourceId: post.ID,
   *       params: JSON.stringify({ actorName, title })
   *     });
   *
   * Named `raise`, not `emit` — `emit` collides with a built-in method
   * on cds.ApplicationService and CAP refuses to generate a typed method
   * for it (warning at boot, `cds watch` never actually clean).
   *
   * `internal-user` allows exactly that in-process call while
   * refusing it over HTTP. `Admin` is added so we can test it with
   * curl during development — remove it once the other lots are
   * calling it in-process.
   */
  @requires: ['internal-user', 'Administrator']
  action raise(
    recipientID : String(255) @mandatory,
    type        : String(30)  @mandatory,
    sourceType  : String(20),
    sourceId    : UUID,
    params      : String
  ) returns UUID;
}
