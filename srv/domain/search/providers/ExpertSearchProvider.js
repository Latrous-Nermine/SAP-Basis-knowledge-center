import cds from '@sap/cds';
import { makeSearchCaseInsensitive } from '../../CaseInsensitiveSearch.js';

/**
 * Reads through PeopleService via .tx(req). People has no per-row
 * @restrict (every profile is readable by every authenticated user,
 * by design - PeopleService's own file header explains why), so this
 * mainly matters for consistency with the other two providers rather
 * than closing an actual leak here.
 */
export default class ExpertSearchProvider {
  type = 'expert';
  label = 'Experts';

  async search(q, req) {
    const peopleSrv = await cds.connect.to('PeopleService');
    const { People } = peopleSrv.entities;

    const p = `%${q}%`;
    const query = SELECT.from(People)
      .columns('userID', 'displayName', 'jobTitle', 'department', 'bio')
      .where`displayName like ${p} or jobTitle like ${p} or department like ${p} or bio like ${p}`
      .limit(10);
    makeSearchCaseInsensitive(query);

    const rows = await peopleSrv.tx(req).run(query);
    return rows.map((row) => ({
      id: row.userID,
      type: this.type,
      title: row.displayName,
      excerpt: row.bio || '',
      meta: [row.jobTitle, row.department].filter(Boolean).join(' · '),
      href: `#/profile/${row.userID}`,
    }));
  }
}
