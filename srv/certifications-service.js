import cds from '@sap/cds';

/**
 * Handler for CertificationsService. Only startCertification needs
 * custom logic - everything else is plain @restrict-enforced CRUD.
 */
export default class CertificationsService extends cds.ApplicationService {

  async init() {
    const { UserCertifications } = cds.entities('aymax.knowledgehub');

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

    return super.init();
  }
}
