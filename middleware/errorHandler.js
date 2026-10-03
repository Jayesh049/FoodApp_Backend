const logger = require("../utilities/logger");

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const status = err.status || err.statusCode || 500;

  if (err.name === "CastError") {
    return res.status(400).json({ message: "Invalid id", requestId: req.id });
  }
  if (err.name === "ValidationError") {
    return res.status(400).json({ message: "Invalid input", requestId: req.id });
  }
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ message: "File too large", requestId: req.id });
  }

  if (status >= 500) {
    logger.error({ err, requestId: req.id }, "request failed");
    return res.status(status).json({
      message: "Internal server error",
      requestId: req.id,
    });
  }

  res.status(status).json({
    message: err.message || "Error",
    requestId: req.id,
  });
}

module.exports = { errorHandler };
