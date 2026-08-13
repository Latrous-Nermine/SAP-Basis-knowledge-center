import cds from '@sap/cds';

/**
 * Handler for RapportsStageService. Stays thin, same convention as
 * PeopleService/HRService - no srv/handlers/RapportsStageHandler.js.
 */
export default class RapportsStageService extends cds.ApplicationService {

  async init() {
    const { Rapports } = this.entities;
    const { RapportHistory } = cds.entities('aymax.knowledgehub');

    // Identity/state come from the server, never the client - same
    // reasoning as DepotService's own before('CREATE') hook. Without
    // this, intern_userID and status were plain client-writable fields.
    this.before('CREATE', 'Rapports', (req) => {
      req.data.intern_userID = req.user.id;
      req.data.status = 'draft';
    });

    this.on('submitRapport', async (req) => {
      const { rapportID } = req.data;
      const row = await SELECT.one.from(Rapports).where({ ID: rapportID });
      if (!row) return req.reject(404, 'Rapport introuvable');
      if (row.intern_userID !== req.user.id) return req.reject(403, 'Vous ne pouvez soumettre que votre propre rapport');
      if (row.status !== 'draft') return req.reject(409, `Impossible de soumettre un rapport déjà '${row.status}'`);

      await UPDATE(Rapports, rapportID).with({ status: 'submitted' });
      await INSERT.into(RapportHistory).entries({
        rapport_ID: rapportID,
        text: 'Rapport soumis à votre tuteur',
      });
      return true;
    });

    return super.init();
  }
}
