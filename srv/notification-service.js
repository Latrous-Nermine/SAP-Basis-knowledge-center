import cds from '@sap/cds';
import {
  validateEmitPayload,
  serializeParams,
  severityFor,
} from './lib/notifications/notification-rules.js';

/**
 * Handler for NotificationService.
 *
 * CAP finds this file automatically because it sits next to
 * notification-service.cds and shares its base name.
 *
 * ESM syntax (`import` / `export default`) is required: the project's
 * package.json declares "type": "module", so `require()` would throw.
 *
 * The handlers below stay THIN. They read the request, delegate the
 * rules to notification-rules.js, run one query, and return. No
 * business logic lives in this file.
 */
export default class NotificationService extends cds.ApplicationService {

  async init() {
    // Database-level entity (not the service projection).
    // We write through this one deliberately: the service projection is
    // @readonly, and these actions perform their OWN authorization
    // checks, which is exactly what we want to be explicit about.
    const { Notifications } = cds.entities('aymax.knowledgehub');

    // ────────────────────────────────────────────────────────────
    // GET /unreadCount()
    // ────────────────────────────────────────────────────────────
    this.on('unreadCount', async (req) => {
      const row = await SELECT.one
        .from(Notifications)
        .columns('count(*) as unread')
        .where({ recipient_userID: req.user.id, isRead: false });

      return row?.unread ?? 0;
    });

    // ────────────────────────────────────────────────────────────
    // POST /markRead
    // ────────────────────────────────────────────────────────────
    this.on('markRead', async (req) => {
      const { notificationID } = req.data;
      if (!notificationID) return req.reject(400, 'notificationID is required');

      // ⚠️ THE MOST IMPORTANT LINE IN THIS FILE ⚠️
      // `recipient_userID: req.user.id` in the WHERE clause is a
      // SECURITY check, not a convenience.
      //
      // @restrict protects entity CRUD (GET/PATCH/DELETE on the
      // entity set). It does NOT protect custom actions. Without
      // this condition, any authenticated user could mark ANY
      // notification read by passing its ID.
      const affected = await UPDATE(Notifications)
        .set({ isRead: true, readAt: new Date() })
        .where({
          ID: notificationID,
          recipient_userID: req.user.id,
          isRead: false,
        });

      return affected > 0;
    });

    // ────────────────────────────────────────────────────────────
    // POST /markAllRead
    // ────────────────────────────────────────────────────────────
    this.on('markAllRead', async (req) => {
      return await UPDATE(Notifications)
        .set({ isRead: true, readAt: new Date() })
        .where({ recipient_userID: req.user.id, isRead: false });
    });

    // ────────────────────────────────────────────────────────────
    // POST /raise         (Contract A — called by other lots)
    // ────────────────────────────────────────────────────────────
    this.on('raise', async (req) => {
      const { recipientID, type, sourceType, sourceId, params } = req.data;

      const errors = validateEmitPayload(req.data);
      if (errors.length) return req.reject(400, errors.join('; '));

      // Never notify someone about their own action — the design's
      // list contains no "vous avez commenté votre publication".
      if (recipientID === req.user.id) return null;

      const ID = cds.utils.uuid();

      await INSERT.into(Notifications).entries({
        ID,
        recipient_userID: recipientID,
        type,
        severity: severityFor(type),   // derived, never caller-supplied
        sourceType: sourceType ?? null,
        sourceId: sourceId ?? null,
        params: serializeParams(params),
        isRead: false,
      });

      return ID;
    });

    return super.init();
  }
}
