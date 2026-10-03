const mongoose = require("mongoose");

function replicaSetUnavailable(err) {
  const msg = String((err && err.message) || "");
  return (
    msg.includes("replica set") ||
    msg.includes("Transaction numbers") ||
    msg.includes("transactions are not supported")
  );
}

/**
 * Prefer a Mongo transaction. Standalone local Mongo cannot do that, so the
 * unique payment id remains the lock against a double confirm.
 */
async function runMoneyTransaction(work) {
  let session;
  try {
    session = await mongoose.startSession();
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } catch (err) {
    if (replicaSetUnavailable(err)) {
      return work(null);
    }
    throw err;
  } finally {
    if (session) await session.endSession();
  }
}

module.exports = { runMoneyTransaction };
