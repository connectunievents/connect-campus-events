const path = require('node:path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const { createSupabase } = require('./lib/supabase');
const { authMiddleware } = require('./middleware/auth');
const { notFound, errorHandler } = require('./middleware/errors');
const { ticketService } = require('./services/tickets');
const { emailService } = require('./services/email');
const { paymentService } = require('./services/payments');
const { eventsRouter } = require('./routes/events');
const { sponsorsRouter } = require('./routes/sponsors');
const { checkinRouter } = require('./routes/checkin');
const { chatbotRouter } = require('./routes/chatbot');
const { paymentsRouter } = require('./routes/payments');

function createApp(config, overrides = {}) {
  const app = express();
  const supabase = overrides.supabase === undefined ? createSupabase(config) : overrides.supabase;
  const auth = overrides.auth || authMiddleware(supabase);
  const tickets = overrides.tickets || ticketService(config.jwtSecret);
  const email = overrides.email || emailService(config);
  const payments = overrides.payments || paymentService(config);
  const allowedOrigins = new Set([config.frontendUrl, 'http://localhost:8080', 'http://127.0.0.1:8080']);

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin(origin, callback) { callback(null, !origin || allowedOrigins.has(origin)); }, credentials: true, allowedHeaders: ['Content-Type', 'Authorization', 'X-Connect-Webhook-Secret'] }));
  app.use(express.json({ limit: '200kb' }));

  const limiterOptions = { standardHeaders: 'draft-8', legacyHeaders: false, message: { error: { code: 'rate_limited', message: 'Too many requests. Please try again later.' } } };
  const applicationLimiter = rateLimit({ ...limiterOptions, windowMs: 60 * 60 * 1000, limit: config.nodeEnv === 'test' ? 2 : 5 });
  const chatbotLimiter = rateLimit({ ...limiterOptions, windowMs: 10 * 60 * 1000, limit: config.nodeEnv === 'test' ? 2 : 20 });

  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'connect-api', timestamp: new Date().toISOString() }));
  app.get('/api/auth/me', auth.requireAuth, (req, res) => res.json({ data: { user: { id: req.user.id, email: req.user.email }, profile: req.profile } }));
  app.use('/api/events', eventsRouter({ supabase, auth, tickets, email }));
  app.use('/api/sponsors', sponsorsRouter({ supabase, auth, applicationLimiter }));
  app.use('/api/checkin', checkinRouter({ supabase, auth, tickets }));
  app.use('/api/chatbot', chatbotRouter({ supabase, config, chatbotLimiter }));
  app.use('/api/payments', paymentsRouter({ supabase, auth, payments, config }));

  const frontendRoot = path.resolve(__dirname, '..');
  app.use('/codes', express.static(path.join(frontendRoot, 'codes')));
  app.use(express.static(path.join(frontendRoot, 'html pages'), { extensions: ['html'] }));
  app.get('/', (_req, res) => res.sendFile(path.join(frontendRoot, 'html pages', 'index.html')));
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
