export default function errorHandler(err, req, res, next) {
  console.error(err);
  if (res.headersSent) return next(err);
  const status = err.status || 500;
  const payload = { error: err.message || "Server error" };
  if (err.details) payload.details = err.details;
  res.status(status).json(payload);
}
