const express = require('express');
const { validate } = require('../middleware/validate');
const { HttpError, asyncRoute } = require('../lib/errors');
const { eventQuery, eventBody, idParams } = require('../schemas');

function accessible(event, profile, userId) {
  if (profile?.role === 'admin' || event.organizer_id === userId) return true;
  if (event.status !== 'published') return false;
  if (event.visibility === 'public') return true;
  return profile?.role === 'student' && profile.student_email_verified && profile.university === event.university;
}

function eventsRouter({ supabase, auth, tickets, email }) {
  const router = express.Router();

  router.get('/', auth.optionalAuth, validate(eventQuery, 'query'), asyncRoute(async (req, res) => {
    if (!supabase) throw new HttpError(503, 'Database is not configured.', 'service_unavailable');
    const { page, limit, university, category, date, from, to, search, visibility } = req.query;
    let query = supabase.from('events').select('*', { count: 'exact' });
    if (university) query = query.eq('university', university);
    if (category) query = query.ilike('category', category);
    if (visibility) query = query.eq('visibility', visibility);
    if (date) {
      const start = new Date(`${date}T00:00:00.000Z`);
      const end = new Date(start); end.setUTCDate(end.getUTCDate() + 1);
      query = query.gte('start_time', start.toISOString()).lt('start_time', end.toISOString());
    }
    if (from) query = query.gte('start_time', from);
    if (to) query = query.lte('start_time', to);
    if (search) {
      const safe = search.replace(/[,%()]/g, ' ').replace(/\s+/g, ' ').trim();
      if (safe) query = query.or(`title.ilike.%${safe}%,description.ilike.%${safe}%,location.ilike.%${safe}%`);
    }
    const fetchLimit = Math.min(500, limit * 5);
    const { data, error } = await query.order('start_time').range(0, fetchLimit - 1);
    if (error) throw new HttpError(500, 'Could not load events.', 'database_error');
    const allowed = data.filter((event) => accessible(event, req.profile, req.user?.id));
    const offset = (page - 1) * limit;
    res.json({ data: allowed.slice(offset, offset + limit), pagination: { page, limit, returned: Math.min(limit, Math.max(0, allowed.length - offset)), accessibleTotal: allowed.length } });
  }));

  router.get('/:id', auth.optionalAuth, validate(idParams, 'params'), asyncRoute(async (req, res) => {
    const { data, error } = await supabase.from('events').select('*').eq('id', req.params.id).maybeSingle();
    if (error || !data || !accessible(data, req.profile, req.user?.id)) throw new HttpError(404, 'Event not found.', 'event_not_found');
    res.json({ data });
  }));

  router.post('/', auth.requireAuth, auth.requireRole('organizer', 'admin'), validate(eventBody), asyncRoute(async (req, res) => {
    const payload = { ...req.body, organizer_id: req.user.id };
    const { data, error } = await supabase.from('events').insert(payload).select().single();
    if (error) throw new HttpError(500, 'Could not create the event.', 'database_error');
    res.status(201).json({ data });
  }));

  router.post('/:id/register', auth.requireAuth, validate(idParams, 'params'), asyncRoute(async (req, res) => {
    const { data: event, error: eventError } = await supabase.from('events').select('*').eq('id', req.params.id).maybeSingle();
    if (eventError || !event || !accessible(event, req.profile, req.user.id) || event.status !== 'published') throw new HttpError(404, 'Event not found or unavailable.', 'event_not_found');
    if (new Date(event.start_time) <= new Date()) throw new HttpError(409, 'Registration is closed because this event has started.', 'registration_closed');
    if (event.visibility === 'private' && !(req.profile.role === 'student' && req.profile.student_email_verified && req.profile.university === event.university)) {
      throw new HttpError(403, 'This event is restricted to verified students at its university.', 'ineligible');
    }
    const { data: registration, error } = await supabase.rpc('register_for_event', { p_event_id: event.id, p_user_id: req.user.id });
    if (error) {
      if (error.code === '23505' || /already registered/i.test(error.message)) throw new HttpError(409, 'You are already registered for this event.', 'duplicate_registration');
      throw new HttpError(500, 'Could not register for the event.', 'database_error');
    }
    const row = Array.isArray(registration) ? registration[0] : registration;
    let ticket = null;
    if (row.status === 'registered' && Number(event.price) === 0) {
      ticket = await tickets.issue(row);
      const { error: ticketError } = await supabase.from('event_registrations').update({ qr_code: ticket.token }).eq('id', row.id);
      if (ticketError) throw new HttpError(500, 'Registration succeeded but ticket generation could not be saved.', 'ticket_save_failed');
      await email.send({ type: 'registration_confirmation', to: req.user.email, event, ticket }).catch(() => {});
    }
    res.status(201).json({ data: { registration: { ...row, qr_code: undefined }, ticket, waitlisted: row.status === 'waitlisted', message: row.status === 'waitlisted' ? 'The event is full. You were added to the waitlist.' : Number(event.price) > 0 ? 'Your place is held pending demo payment.' : 'Registration confirmed.' } });
  }));

  return router;
}

module.exports = { eventsRouter, accessible };
