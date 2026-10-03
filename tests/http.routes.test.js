const { before, after, describe, it } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { checkoutDigest } = require("../utilities/paymentSignature");

process.env.JWTSECRET = "http-route-secret-value-0123456789";
process.env.NODE_ENV = "test";
process.env.KEY_ID = "rzp_test_route";
process.env.KEY_SECRET = "route-test-key-secret";
process.env.FRONTEND_URL = "http://localhost:3001";

let mongod;
let app;
let request;
let User;
let Plan;
let Booking;
let CheckoutOrder;
let Payment;

before(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.DB_LINK = mongod.getUri();
  request = require("supertest");
  app = require("../api");
  User = require("../model/userModule");
  Plan = require("../model/planModel");
  Booking = require("../model/bookingModel");
  CheckoutOrder = require("../model/checkoutOrderModel");
  Payment = require("../model/paymentModel");
  await mongoose.connection.asPromise();
});

after(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

async function makeUser(email, role) {
  return User.create({
    name: email.split("@")[0],
    email,
    password: "password1",
    confirmPassword: "password1",
    isEmailVerified: true,
    role: role || "user",
  });
}

async function login(email) {
  const agent = request.agent(app);
  const res = await agent.post("/api/v1/auth/login").send({
    email,
    password: "password1",
  });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return { agent, csrf: res.body.csrfToken };
}

async function makePlan(name) {
  return Plan.create({
    name,
    description: "Weekly vegetarian plate",
    duration: 7,
    price: 200,
    discount: 10,
  });
}

function bookingDoc(userId, plan) {
  return {
    user: userId,
    plan: plan._id,
    priceAtThatTime: 190,
    quantity: 1,
    status: "pending",
    planDetails: {
      image: "plate.png",
      price: 200,
      discount: 10,
      reviews: [],
    },
  };
}

describe("HTTP routes", () => {
  it("rejects an anonymous booking read and a wrong password", async () => {
    const missing = await request(app).get(
      "/api/v1/booking/507f1f77bcf86cd799439011"
    );
    assert.equal(missing.status, 401);

    await makeUser("wrong-pass@example.com");
    const bad = await request(app).post("/api/v1/auth/login").send({
      email: "wrong-pass@example.com",
      password: "not-the-password",
    });
    assert.equal(bad.status, 403);
  });

  it("stops user A from reading user B's booking", async () => {
    const userA = await makeUser("a@example.com");
    const userB = await makeUser("b@example.com");
    const plan = await makePlan("Idor Plate");
    const booking = await Booking.create({
      ...bookingDoc(userB._id, plan),
      status: "confirmed",
    });
    const { agent } = await login(userA.email);
    const res = await agent.get(`/api/v1/booking/${booking._id}`);
    assert.equal(res.status, 403);
    assert.equal(res.body.message, "Not allowed to view this booking");
  });

  it("blocks a normal user from creating a plan", async () => {
    await makeUser("member@example.com");
    const { agent, csrf } = await login("member@example.com");
    const res = await agent
      .post("/api/v1/plan/")
      .set("x-csrf-token", csrf)
      .send({ name: "Secret Plan", price: 100, duration: 7 });
    assert.equal(res.status, 403);
    assert.equal(res.body.message, "Admin access required");
  });

  it("requires a confirmed purchase before a review", async () => {
    const user = await makeUser("reviewer@example.com");
    const plan = await makePlan("Review Plate");
    const { agent, csrf } = await login(user.email);
    const blocked = await agent
      .post(`/api/v1/review/plan/${plan._id}`)
      .set("x-csrf-token", csrf)
      .send({ rating: 5, description: "Loved the thali" });
    assert.equal(blocked.status, 403);
    assert.equal(blocked.body.message, "You must purchase this plan to review it");

    await Booking.create({
      ...bookingDoc(user._id, plan),
      status: "confirmed",
    });
    const created = await agent
      .post(`/api/v1/review/plan/${plan._id}`)
      .set("x-csrf-token", csrf)
      .send({ rating: 5, description: "Loved the thali" });
    assert.equal(created.status, 201);
  });

  it("confirms a payment once and treats the repeat as a duplicate", async () => {
    const user = await makeUser("payer@example.com");
    const plan = await makePlan("Pay Plate");
    const booking = await Booking.create(bookingDoc(user._id, plan));
    const orderId = "order_route_test_1";
    const paymentId = "pay_route_test_1";
    await CheckoutOrder.create({
      razorpayOrderId: orderId,
      user: user._id,
      bookingIds: [booking._id],
      amountPaise: 19000,
      status: "pending",
    });
    const signature = checkoutDigest(process.env.KEY_SECRET, orderId, paymentId);
    const { agent, csrf } = await login(user.email);
    const body = {
      orderCreationId: orderId,
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: signature,
      bookingIds: [String(booking._id)],
    };
    const first = await agent
      .post("/api/v1/booking/verification")
      .set("x-csrf-token", csrf)
      .send(body);
    assert.equal(first.status, 200, JSON.stringify(first.body));
    assert.equal(first.body.duplicate, false);

    const second = await agent
      .post("/api/v1/booking/verification")
      .set("x-csrf-token", csrf)
      .send(body);
    assert.equal(second.status, 200, JSON.stringify(second.body));
    assert.equal(second.body.duplicate, true);
    assert.equal(await Payment.countDocuments({ razorpayPaymentId: paymentId }), 1);
    const stored = await Booking.findById(booking._id);
    assert.equal(stored.status, "confirmed");
  });
});
