const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const { HttpError } = require('../lib/errors');

function ticketService(secret) {
  const ensureSecret = () => {
    if (!secret || secret.length < 32) throw new HttpError(503, 'Ticket signing is not configured.', 'ticket_service_unavailable');
  };
  return {
    async issue(registration) {
      ensureSecret();
      const token = jwt.sign({ typ: 'connect-ticket', rid: registration.id, eid: registration.event_id, uid: registration.user_id }, secret, { algorithm: 'HS256', expiresIn: '180d', issuer: 'connect-api', audience: 'connect-checkin' });
      return { token, qrDataUrl: await QRCode.toDataURL(token, { errorCorrectionLevel: 'M', margin: 2, width: 320 }) };
    },
    verify(token) {
      ensureSecret();
      try {
        const payload = jwt.verify(token, secret, { algorithms: ['HS256'], issuer: 'connect-api', audience: 'connect-checkin' });
        if (payload.typ !== 'connect-ticket' || !payload.rid || !payload.eid) throw new Error('Malformed ticket');
        return payload;
      } catch {
        throw new HttpError(400, 'The ticket is invalid, forged, or expired.', 'invalid_ticket');
      }
    }
  };
}

module.exports = { ticketService };
