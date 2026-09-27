function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const status = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === "production";

  if (err.name === "CastError") {
    return res.status(400).json({ message: "Invalid id" });
  }
  if (err.name === "ValidationError") {
    return res.status(400).json({ message: err.message });
  }
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ message: "File too large" });
  }

  if (!isProd) {
    console.error(err);
  }

  res.status(status).json({
    message: status >= 500 && isProd ? "Internal server error" : err.message || "Error",
  });
}

module.exports = { errorHandler };
