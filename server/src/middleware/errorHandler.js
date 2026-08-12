export function errorHandler(err, req, res, next) {
  if (err.name === 'ZodError') {
    return res.status(400).json({ error: 'Validation failed', details: err.flatten() });
  }

  const status = err.status || 500;
  if (status >= 500) {
    console.error(err);
  }
  res.status(status).json({ error: err.publicMessage || err.message || 'Internal Server Error' });
}

export class HttpError extends Error {
  constructor(status, message, publicMessage) {
    super(message || publicMessage);
    this.status = status;
    this.publicMessage = publicMessage || message;
  }
}
