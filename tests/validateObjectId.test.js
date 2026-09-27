const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { validateObjectId } = require("../middleware/validateObjectId");

describe("validateObjectId middleware", () => {
  it("rejects invalid ids with 400", () => {
    const mw = validateObjectId("bookingId");
    const req = { params: { bookingId: "not-an-id" } };
    let statusCode = 0;
    let body = null;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(payload) {
        body = payload;
        return this;
      },
    };
    let nextCalled = false;
    mw(req, res, () => {
      nextCalled = true;
    });
    assert.equal(statusCode, 400);
    assert.equal(nextCalled, false);
    assert.match(String(body.message || ""), /Invalid/i);
  });

  it("calls next for valid ObjectId", () => {
    const mw = validateObjectId("bookingId");
    const req = { params: { bookingId: "507f1f77bcf86cd799439011" } };
    let nextCalled = false;
    const res = {
      status() {
        return this;
      },
      json() {
        return this;
      },
    };
    mw(req, res, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, true);
  });
});
