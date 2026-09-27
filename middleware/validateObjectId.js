const mongoose = require("mongoose");

/**
 * Validate :paramName as a Mongo ObjectId. Use after route params are defined.
 * @param {string} paramName
 */
function validateObjectId(paramName = "id") {
  return function validateObjectIdMiddleware(req, res, next) {
    const value = req.params[paramName];
    if (!value || !mongoose.Types.ObjectId.isValid(value)) {
      return res.status(400).json({ message: `Invalid ${paramName}` });
    }
    next();
  };
}

module.exports = { validateObjectId };
