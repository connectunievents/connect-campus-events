const crypto = require('node:crypto');
const { HttpError } = require('../lib/errors');

function paymentService(config) {
  if (config.paymentProvider !== 'mock') {
    return { create: async () => { throw new HttpError(503, 'The approved payment provider is not configured.', 'payment_unavailable'); } };
  }
  return {
    async create({ registrationId, amount }) {
      if (config.nodeEnv === 'production') throw new HttpError(503, 'Mock payments are disabled in production.', 'payment_unavailable');
      return { provider: 'mock', isRealPayment: false, reference: `mock_${crypto.randomUUID()}`, registrationId, amount, status: 'pending', message: 'Demo only — no money was transferred.' };
    }
  };
}

module.exports = { paymentService };
