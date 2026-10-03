const FooduserModel = require("../model/userModule");
const config = require("./config");
const logger = require("./logger");

function getAdminConfig() {
  return {
    email: config.optional("ADMIN_EMAIL").toLowerCase().trim(),
    password: config.optional("ADMIN_PASSWORD"),
    name: process.env.ADMIN_NAME || "FoodApp Admin",
  };
}

function isBcryptHash(value) {
  return typeof value === "string" && value.startsWith("$2");
}

async function ensureAdminUser() {
  const { email, password, name } = getAdminConfig();
  if (!email || !password) {
    logger.warn("ADMIN_EMAIL or ADMIN_PASSWORD not set, skipping admin seed");
    return;
  }

  let user = await FooduserModel.findOne({ email });
  if (!user) {
    user = await FooduserModel.create({
      name,
      email,
      password,
      confirmPassword: password,
      role: "admin",
      isEmailVerified: true,
    });
    logger.info("created admin user");
  } else {
    user.name = name;
    user.role = "admin";
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpiry = undefined;
    // Hash legacy plaintext once; do not overwrite hashed password every boot
    if (!isBcryptHash(user.password)) {
      user.password = password;
      user.confirmPassword = password;
    }
    await user.save();
    logger.info("ensured admin user");
  }

  const demoted = await FooduserModel.updateMany(
    { email: { $ne: email }, role: "admin" },
    { $set: { role: "user" } }
  );
  if (demoted.modifiedCount > 0) {
    logger.info({ count: demoted.modifiedCount }, "removed extra admin roles");
  }
}

module.exports = { ensureAdminUser, ensureDemoUser, getAdminConfig };

async function ensureDemoUser() {
  const email = config.optional("DEMO_EMAIL").toLowerCase().trim();
  const password = config.optional("DEMO_PASSWORD");
  const name = process.env.DEMO_NAME || "FoodApp Demo";
  if (!email || !password) return;
  let user = await FooduserModel.findOne({ email });
  if (!user) {
    await FooduserModel.create({
      name,
      email,
      password,
      confirmPassword: password,
      role: "user",
      isEmailVerified: true,
    });
    return;
  }
  user.isEmailVerified = true;
  user.role = user.role === "admin" ? "admin" : "user";
  if (!isBcryptHash(user.password)) {
    user.password = password;
    user.confirmPassword = password;
  }
  await user.save();
}
