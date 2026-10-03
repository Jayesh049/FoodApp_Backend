const { describe, it, after } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

process.env.JWTSECRET = "http-test-secret-value-0123456789";
process.env.DB_LINK = "mongodb://127.0.0.1:27017/foodapp_http_test";
process.env.NODE_ENV = "test";

const request = require("supertest");
const app = require("../api");

describe("HTTP validation", () => {
  it("rejects a malformed signup before any write", async () => {
    const res = await request(app).post("/api/v1/auth/signup").send({ email: "not-an-email" });
    assert.equal(res.status, 400);
    assert.equal(res.body.message, "Invalid input");
  });

  it("rejects an anonymous location IP lookup", async () => {
    const res = await request(app).get("/api/v1/location/ip");
    assert.equal(res.status, 401);
  });
});

after(async () => {
  await mongoose.disconnect();
});
