const { HttpError } = require('../lib/errors');

const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message }));
    return next(new HttpError(400, 'The request contains invalid fields.', 'validation_error', details));
  }
  req[source] = result.data;
  next();
};

module.exports = { validate };
