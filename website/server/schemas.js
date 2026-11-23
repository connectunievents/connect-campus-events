const { z } = require('zod');

const uuid = z.string().uuid();
const idParams = z.object({ id: uuid }).strict();
const optionalText = (max) => z.string().trim().max(max).optional().nullable();

const eventQuery = z.object({
  university: z.enum(['LAU', 'AUB', 'NDU']).optional(),
  category: z.string().trim().min(1).max(60).optional(),
  date: z.iso.date().optional(),
  from: z.iso.datetime({ offset: true }).optional(),
  to: z.iso.datetime({ offset: true }).optional(),
  search: z.string().trim().max(120).optional(),
  visibility: z.enum(['public', 'private']).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12)
}).strict().refine((value) => !value.from || !value.to || new Date(value.from) <= new Date(value.to), { message: '`from` must be before `to`.', path: ['from'] });

const eventBody = z.object({
  title: z.string().trim().min(3).max(160),
  description: optionalText(5000),
  category: z.string().trim().min(2).max(60),
  visibility: z.enum(['public', 'private']).default('public'),
  university: z.enum(['LAU', 'AUB', 'NDU']).optional().nullable(),
  location: z.string().trim().min(2).max(300),
  cover_image_url: z.url().max(2000).optional().nullable(),
  start_time: z.iso.datetime({ offset: true }),
  end_time: z.iso.datetime({ offset: true }).optional().nullable(),
  capacity: z.number().int().positive().max(100000).optional().nullable(),
  price: z.number().min(0).max(1000000).default(0),
  accepts_wish_money: z.boolean().default(false),
  accepts_omt: z.boolean().default(false),
  status: z.enum(['draft', 'published']).default('draft')
}).strict()
  .refine((value) => value.visibility !== 'private' || value.university, { message: 'Private events require a university.', path: ['university'] })
  .refine((value) => !value.end_time || new Date(value.end_time) > new Date(value.start_time), { message: 'End time must be after start time.', path: ['end_time'] });

const sponsorApplication = z.object({
  business_name: z.string().trim().min(2).max(160),
  contact_name: z.string().trim().min(2).max(160),
  contact_email: z.email().max(254),
  contact_phone: optionalText(40),
  business_proof_url: z.string().trim().min(3).max(2000),
  category: z.enum(['food', 'sweets', 'others']),
  product_type: z.string().trim().min(3).max(160),
  description: z.string().trim().min(50).max(3000),
  website_url: z.url().max(2000).optional().nullable(),
  website_hp: z.string().max(0).optional().default('')
}).strict();

const applicationUpdate = z.object({ status: z.enum(['approved', 'rejected', 'pending']), admin_notes: optionalText(2000) }).strict();
const checkinBody = z.object({ token: z.string().trim().min(20).max(5000), event_id: uuid.optional() }).strict();
const chatbotBody = z.object({ question: z.string().trim().min(2).max(800), history: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(1200) }).strict()).max(10).optional().default([]) }).strict();
const paymentBody = z.object({ registration_id: uuid }).strict();

module.exports = { uuid, idParams, eventQuery, eventBody, sponsorApplication, applicationUpdate, checkinBody, chatbotBody, paymentBody };
