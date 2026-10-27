function notFound(req, res) {
  res.status(404).json({ success: false, message: 'Route not found' });
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  const status = error.status || 500;
  if (status >= 500) {
    console.error(error);
  }

  res.status(status).json({
    success: false,
    message: status >= 500 ? 'Internal server error' : error.message,
  });
}

module.exports = { notFound, errorHandler };
