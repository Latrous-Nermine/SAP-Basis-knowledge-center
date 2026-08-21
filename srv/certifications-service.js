import cds from '@sap/cds';
import { notify } from './lib/notify.js';
import { awardReputation } from './lib/reputation.js';

/** Same order of magnitude as Knowledge Center's own achievement-style
    award, category 'badge' to match the seed data's convention for
    other one-off achievements ("Badge « X » débloqué"). */
const REPUTATION_CERTIFICATION_EARNED = 15;

/**
 * Handler for CertificationsService. startCertification/
 * completeCertification need custom logic - everything else is plain
 * @restrict-enforced CRUD.
 */
export default class CertificationsService extends cds.ApplicationService {

  async init() {
    const { UserCertifications, Certifications } = cds.entities('aymax.knowledgehub');

    this.on('startCertification', async (req) => {
      const { userCertificationID } = req.data;

      const row = await SELECT.one.from(UserCertifications).where({ ID: userCertificationID });
      if (!row) return req.reject(404, 'Certification tracking row not found');

      // Row-level check, not just the service's broad @restrict role
      // grant - a manager's own CREATE/UPDATE role grant would otherwise
      // let them silently "start" a certification on someone else's
      // behalf through this self-service action.
      if (row.user_userID !== req.user.id) {
        return req.reject(403, 'You can only start your own certifications');
      }
      if (row.status !== 'recommended') {
        return req.reject(409, `Cannot start a certification that is already '${row.status}'`);
      }

      await UPDATE(UserCertifications, userCertificationID).with({
        status: 'in_progress',
        startDate: new Date().toISOString().slice(0, 10),
        progress: 0
      });
      return true;
    });

    // recommended -> in_progress (above) had a matching in_progress ->
    // earned before this (2026-08): a certification a user started
    // could never be marked complete by anyone. Same self-service shape
    // and same row-level ownership check as startCertification.
    this.on('completeCertification', async (req) => {
      const { userCertificationID } = req.data;

      const row = await SELECT.one.from(UserCertifications).where({ ID: userCertificationID });
      if (!row) return req.reject(404, 'Certification tracking row not found');
      if (row.user_userID !== req.user.id) {
        return req.reject(403, 'You can only complete your own certifications');
      }
      if (row.status !== 'in_progress') {
        return req.reject(409, `Cannot complete a certification that is '${row.status}', not 'in_progress'`);
      }

      await UPDATE(UserCertifications, userCertificationID).with({
        status: 'earned',
        earnedDate: new Date().toISOString().slice(0, 10),
        progress: 100
      });

      const cert = await SELECT.one.from(Certifications).columns('ID', 'name', 'relatedSkill').where({ ID: row.certification_ID });

      await awardReputation(
        req.user.id, REPUTATION_CERTIFICATION_EARNED,
        `Certification « ${cert?.name ?? ''} » terminée`, 'badge',
        { sourceType: 'Certification', sourceID: row.certification_ID },
      );

      // Celebratory, not a business-process alert - recipient IS the
      // actor on purpose (this is the one notification type meant to
      // congratulate the person who just did the thing, not tell a
      // third party about it).
      notify(req.user.id, 'CERTIFICATION_COMPLETED', {
        sourceType: 'CERTIFICATION', sourceId: row.certification_ID,
        params: { certificationName: cert?.name ?? '' },
      });

      // Experts' technology filter (PeopleService.UserTechnologies)
      // reads UserTechnologyTags - completing a certification never
      // populated it, so earning "SAP BTP Associate" never made you
      // more findable under the "SAP BTP" filter, even though the two
      // modules track overlapping skill information.
      //
      // relatedSkill is free text (Certifications.relatedSkill, not a
      // Tags association - Riadh's original schema, not something to
      // restructure here), so this is a best-effort substring match
      // against the existing Tags catalog, not a guaranteed link: real
      // overlap exists today ("SAP BTP"/"SAP Fiori"/"Cloud Foundry"
      // match exactly, "SAP HANA" matches the "HANA" tag as a
      // substring) but a relatedSkill with no matching tag at all
      // (there is no tag-creation happening here either way) simply
      // links nothing, silently - not an error.
      if (cert?.relatedSkill) {
        const { Tags, UserTechnologyTags } = cds.entities('aymax.knowledgehub');
        const allTags = await SELECT.from(Tags).columns('ID', 'name');
        const sSkillLower = cert.relatedSkill.toLowerCase();
        const matchingTags = allTags.filter((tag) => {
          const sTagLower = tag.name.toLowerCase();
          return sSkillLower.includes(sTagLower) || sTagLower.includes(sSkillLower);
        });
        for (const tag of matchingTags) {
          const existing = await SELECT.one.from(UserTechnologyTags).where({ user_userID: req.user.id, tag_ID: tag.ID });
          if (!existing) {
            await INSERT.into(UserTechnologyTags).entries({ ID: cds.utils.uuid(), user_userID: req.user.id, tag_ID: tag.ID });
          }
        }
      }

      return true;
    });

    return super.init();
  }
}
