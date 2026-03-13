// catch-all error handler
function errorHandler(err, req, res, next) {
  console.error('Unhandled error:', err.stack || err.message);

  // sequelize validation errors
  if (err.name === 'SequelizeValidationError') {
    const messages = err.errors.map(e => e.message);
    return res.status(400).json({ error: 'Validation failed', details: messages });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({ error: 'A record with that value already exists' });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Something went wrong',
  });
}

module.exports = errorHandler;
