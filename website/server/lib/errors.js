class HttpError extends Error {
  constructor(status, message, code = 'request_error', details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

module.exports = { HttpError, asyncRoute };
