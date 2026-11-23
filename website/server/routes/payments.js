const crypto = require('node:crypto');
const express = require('express');
const { validate } = require('../middleware/validate');
const { HttpError, asyncRoute } = require('../lib/errors');
const { paymentBody } = require('../schemas');

function safeEqual(left, right) {
  const a = Buffer.from(left || ''); const b = Buffer.from(right || '');
  return a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a, b);
}

function paymentsRouter({ supabase, auth, payments, config }) {
  const router = express.Router();
  router.post('/create', auth.requireAuth, validate(paymentBody), asyncRoute(async (req, res) => {
    const { data: registration, error } = await supabase.from('event_registrations').select('id,user_id,event_id,status,events(price)').eq('id', req.body.registration_id).eq('user_id', req.user.id).maybeSingle();
    if (error || !registration) throw new HttpError(404, 'Registration not found.', 'registration_not_found');
    if (registration.status !== 'registered') throw new HttpError(409, 'This registration cannot be paid.', 'payment_not_allowed');
    const amount = Number(registration.events?.price || 0);
    if (amount <= 0) throw new HttpError(409, 'This event does not require payment.', 'payment_not_required');
    res.status(201).json({ data: await payments.create({ registrationId: registration.id, amount }) });
  }));
  router.post('/webhook', express.json({ limit: '100kb' }), asyncRoute(async (req, res) => {
    if (!config.paymentWebhookSecret) throw new HttpError(503, 'Payment webhooks are not configured.', 'payment_unavailable');
    if (!safeEqual(req.get('x-connect-webhook-secret'), config.paymentWebhookSecret)) throw new HttpError(401, 'Invalid webhook authentication.', 'unauthorized');
    if (config.paymentProvider !== 'mock') throw new HttpError(501, 'Provider-specific webhook verification will be enabled after provider approval.', 'provider_not_implemented');
    const parsed = paymentBody.extend({ status: require('zod').z.enum(['paid', 'failed']) }).safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, 'Malformed webhook body.', 'validation_error');
    const { error } = await supabase.from('event_registrations').update({ payment_status: parsed.data.status }).eq('id', parsed.data.registration_id).eq('payment_status', 'pending');
    if (error) throw new HttpError(500, 'Could not process payment status.', 'database_error');
    res.json({ received: true, mock: true });
  }));
  return router;
}

module.exports = { paymentsRouter };
