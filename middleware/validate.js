function validate(schema) {
  return function validateRequest(req, res, next) {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid input",
        errors: parsed.error.flatten().fieldErrors,
      });
    }
    req.body = parsed.data;
    next();
  };
}

module.exports = { validate };
