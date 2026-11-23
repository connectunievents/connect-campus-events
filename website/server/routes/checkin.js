const express = require('express');
const { validate } = require('../middleware/validate');
const { HttpError, asyncRoute } = require('../lib/errors');
const { checkinBody } = require('../schemas');

function checkinRouter({ supabase, auth, tickets }) {
  const router = express.Router();
  router.post('/', auth.requireAuth, auth.requireRole('organizer', 'admin'), validate(checkinBody), asyncRoute(async (req, res) => {
    const payload = tickets.verify(req.body.token);
    if (req.body.event_id && req.body.event_id !== payload.eid) throw new HttpError(400, 'This ticket belongs to a different event.', 'wrong_event');
    const { data: registration, error } = await supabase.from('event_registrations').select('*,events(id,title,organizer_id)').eq('id', payload.rid).eq('event_id', payload.eid).maybeSingle();
    if (error || !registration || registration.qr_code !== req.body.token) throw new HttpError(404, 'Ticket registration not found.', 'ticket_not_found');
    if (req.profile.role !== 'admin' && registration.events?.organizer_id !== req.user.id) throw new HttpError(403, 'You can only check attendees into your own events.', 'forbidden');
    if (registration.checked_in_at) throw new HttpError(409, 'This ticket has already been checked in.', 'already_checked_in', { checked_in_at: registration.checked_in_at });
    if (registration.status !== 'registered') throw new HttpError(409, 'This ticket is not active.', 'inactive_ticket');
    const now = new Date().toISOString();
    const { data: updated, error: updateError } = await supabase.from('event_registrations').update({ checked_in_at: now, status: 'attended' }).eq('id', registration.id).is('checked_in_at', null).select('id,event_id,user_id,status,checked_in_at').maybeSingle();
    if (updateError) throw new HttpError(500, 'Could not complete check-in.', 'database_error');
    if (!updated) throw new HttpError(409, 'This ticket has already been checked in.', 'already_checked_in');
    res.json({ data: updated, message: `Checked in successfully for ${registration.events.title}.` });
  }));
  return router;
}

module.exports = { checkinRouter };
