const express = require('express');
const { validate } = require('../middleware/validate');
const { HttpError, asyncRoute } = require('../lib/errors');
const { sponsorApplication, applicationUpdate, idParams } = require('../schemas');

function sponsorsRouter({ supabase, auth, applicationLimiter }) {
  const router = express.Router();
  router.post('/apply', applicationLimiter, validate(sponsorApplication), asyncRoute(async (req, res) => {
    const { website_hp: _honeypot, ...payload } = req.body;
    const { data, error } = await supabase.from('sponsor_applications').insert({ ...payload, status: 'pending' }).select('id,status,created_at').single();
    if (error) throw new HttpError(500, 'Could not submit the application.', 'database_error');
    res.status(201).json({ data, message: 'Application submitted for review.' });
  }));
  router.get('/', asyncRoute(async (_req, res) => {
    const { data, error } = await supabase.from('sponsors').select('id,business_name,category,logo_url,description,product_type,contact_email,contact_phone,website_url,created_at').eq('is_active', true).order('created_at', { ascending: false });
    if (error) throw new HttpError(500, 'Could not load sponsors.', 'database_error');
    res.json({ data });
  }));
  router.patch('/applications/:id', auth.requireAuth, auth.requireRole('admin'), validate(idParams, 'params'), validate(applicationUpdate), asyncRoute(async (req, res) => {
    const { data: existing, error: findError } = await supabase.from('sponsor_applications').select('*').eq('id', req.params.id).maybeSingle();
    if (findError) throw new HttpError(500, 'Could not load the application.', 'database_error');
    if (!existing) throw new HttpError(404, 'Sponsor application not found.', 'application_not_found');
    const update = { ...req.body, reviewed_by: req.user.id, reviewed_at: new Date().toISOString() };
    const { data: application, error } = await supabase.from('sponsor_applications').update(update).eq('id', req.params.id).select().maybeSingle();
    if (error) throw new HttpError(500, 'Could not update the application.', 'database_error');
    if (!application) throw new HttpError(404, 'Sponsor application not found.', 'application_not_found');
    if (req.body.status === 'approved' && existing.status !== 'approved') {
      const sponsor = { business_name: application.business_name, category: application.category || 'others', description: application.description, product_type: application.product_type, contact_email: application.contact_email, contact_phone: application.contact_phone, website_url: application.website_url, is_active: true };
      const { error: sponsorError } = await supabase.from('sponsors').insert(sponsor);
      if (sponsorError) throw new HttpError(500, 'The application was approved, but its sponsor listing could not be created.', 'sponsor_create_failed');
    }
    res.json({ data: application });
  }));
  return router;
}

module.exports = { sponsorsRouter };
