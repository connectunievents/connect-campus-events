const express = require('express');
const { validate } = require('../middleware/validate');
const { HttpError, asyncRoute } = require('../lib/errors');
const { chatbotBody } = require('../schemas');

const cleanSearch = (value) => value.replace(/[,%()]/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter((word) => word.length > 2).slice(0, 5);

function chatbotRouter({ supabase, config, chatbotLimiter }) {
  const router = express.Router();
  router.post('/', chatbotLimiter, validate(chatbotBody), asyncRoute(async (req, res) => {
    if (!config.groqApiKey) throw new HttpError(503, 'Connect Guide AI is not configured. Add GROQ_API_KEY to the server environment.', 'chatbot_unavailable');
    const terms = cleanSearch(req.body.question);
    let eventQuery = supabase.from('events').select('title,description,category,university,location,start_time,price').eq('status', 'published').eq('visibility', 'public').order('start_time').limit(8);
    let sponsorQuery = supabase.from('sponsors').select('business_name,category,description,product_type,website_url').eq('is_active', true).limit(8);
    if (terms.length) {
      const filters = terms.flatMap((term) => [`title.ilike.%${term}%`, `description.ilike.%${term}%`, `category.ilike.%${term}%`]).join(',');
      eventQuery = eventQuery.or(filters);
      sponsorQuery = sponsorQuery.or(terms.flatMap((term) => [`business_name.ilike.%${term}%`, `description.ilike.%${term}%`, `category.ilike.%${term}%`]).join(','));
    }
    const [eventsResult, sponsorsResult] = await Promise.all([eventQuery, sponsorQuery]);
    const events = eventsResult.error ? [] : eventsResult.data;
    const sponsors = sponsorsResult.error ? [] : sponsorsResult.data;
    const context = JSON.stringify({ events, sponsors });
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { authorization: `Bearer ${config.groqApiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: config.groqModel,
        temperature: 0.2,
        max_completion_tokens: 500,
        messages: [
          { role: 'system', content: 'You are Connect Guide for a Lebanese university-events platform. Use supplied Connect database context for event and sponsor facts. Never invent listings, dates, prices, availability, or sponsors. If context lacks an answer, say so clearly. You may answer general navigation questions conversationally. Be concise and useful. Do not expose raw JSON.' },
          { role: 'system', content: `Current public Connect context: ${context}` },
          ...req.body.history.slice(-6),
          { role: 'user', content: req.body.question }
        ]
      }),
      signal: AbortSignal.timeout(12000)
    }).catch(() => null);
    if (!response || !response.ok) throw new HttpError(502, 'Connect Guide is temporarily unavailable.', 'chatbot_provider_error');
    const result = await response.json();
    const answer = result.choices?.[0]?.message?.content?.trim();
    if (!answer) throw new HttpError(502, 'Connect Guide returned an empty response.', 'chatbot_provider_error');
    res.json({ data: { answer, sources: { events: events.length, sponsors: sponsors.length } } });
  }));
  return router;
}

module.exports = { chatbotRouter };
