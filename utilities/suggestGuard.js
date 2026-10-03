function gatePlanIds(retrievedIds, candidateIds) {
  const allow = new Set((retrievedIds || []).map(String));
  return (candidateIds || []).map(String).filter((id) => allow.has(id));
}

function stripUnknownIds(text, allowedIds) {
  const allow = new Set((allowedIds || []).map(String));
  return String(text || "").replace(/[a-f0-9]{24}/gi, (id) => (allow.has(id) ? id : ""));
}

function ownBookingSummary(doc) {
  return {
    id: String(doc._id),
    status: doc.status,
    quantity: doc.quantity,
    priceAtThatTime: doc.priceAtThatTime,
    bookedAt: doc.bookedAt,
  };
}

const MAX_SUGGEST_QUERY = 400;

module.exports = {
  gatePlanIds,
  stripUnknownIds,
  ownBookingSummary,
  MAX_SUGGEST_QUERY,
};
