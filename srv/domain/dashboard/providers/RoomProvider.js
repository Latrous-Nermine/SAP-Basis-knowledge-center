import cds from '@sap/cds';

/**
 * "Activité des rooms" (Manager dashboard). TODO-INTEGRATION.md I-03
 * assumed this needed Lot 3's Rooms module - but Rooms, Posts.room and
 * Rooms.followersCount already exist in Lot 1's schema (db/schema.cds).
 * Built for real instead of an empty state (confirmed in Phase 3): a
 * room's "last activity" is its most recent Post; "member count" reuses
 * the existing denormalised followersCount, the same field the Feed
 * sidebar already shows.
 */
export default class RoomProvider {
  async getRoomActivity(limit) {
    const { Rooms, Posts } = cds.entities('aymax.knowledgehub');

    const rooms = await SELECT.from(Rooms).columns('ID', 'name', 'followersCount');
    if (!rooms.length) return { available: true, totalCount: 0, items: [] };

    const roomIDs = rooms.map((r) => r.ID);
    const posts = await SELECT.from(Posts).columns('room_ID', 'createdAt')
      .where({ room_ID: { in: roomIDs } })
      .orderBy('createdAt desc');

    const lastActivityByRoom = new Map();
    for (const p of posts) {
      if (!lastActivityByRoom.has(p.room_ID)) lastActivityByRoom.set(p.room_ID, p.createdAt);
    }

    const items = rooms
      .map((r) => ({
        roomID: r.ID,
        name: r.name,
        lastActivity: lastActivityByRoom.get(r.ID) || null,
        memberCount: r.followersCount || 0
      }))
      .filter((r) => r.lastActivity)
      .sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));

    return { available: true, totalCount: items.length, items: items.slice(0, limit) };
  }
}
