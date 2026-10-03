const mongoose = require("mongoose");

const auditEventSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.ObjectId, ref: "FooduserModel", required: true },
  action: { type: String, required: true },
  targetId: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

const AuditEvent = mongoose.model("auditEventModel", auditEventSchema);

function auditAfter(action) {
  return function auditMiddleware(req, res, next) {
    const orig = res.json.bind(res);
    res.json = function auditedJson(body) {
      if (res.statusCode < 400 && req.userId) {
        const targetId = String(
          (req.params && (req.params.planRoutes || req.params.bookingId)) ||
            (body && body.plan && body.plan._id) ||
            ""
        );
        AuditEvent.create({
          actor: req.userId,
          action,
          targetId,
          createdAt: new Date(),
        }).catch(() => {});
      }
      return orig(body);
    };
    next();
  };
}

module.exports = { AuditEvent, auditAfter };
