function notFound(req, res) {
  res.status(404).json({ error: { code: 'not_found', message: `No route matches ${req.method} ${req.path}.` } });
}

function errorHandler(error, _req, res, _next) {
  const status = Number.isInteger(error.status) ? error.status : 500;
  if (status >= 500) console.error('[Connect API]', error);
  const body = { error: { code: error.code || 'internal_error', message: status >= 500 ? 'An unexpected server error occurred.' : error.message } };
  if (error.details && status < 500) body.error.details = error.details;
  res.status(status).json(body);
}

module.exports = { notFound, errorHandler };
