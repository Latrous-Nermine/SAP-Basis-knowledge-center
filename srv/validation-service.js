import cds from '@sap/cds'

export default class ValidationService extends cds.ApplicationService {
  async init () {
    const { ValidationItems, ValidationCounts } = this.entities

    this.on('READ', ValidationCounts, async (req) => {
      const items = await SELECT.from(ValidationItems)

      const pending  = items.filter(i => i.status === 'pending').length
      const approved = items.filter(i => i.status === 'approved').length
      const rejected = items.filter(i => i.status === 'rejected').length
      const total    = items.length

      return [{ ID: 1, pending, approved, rejected, total }]
    })

    return super.init()
  }
}