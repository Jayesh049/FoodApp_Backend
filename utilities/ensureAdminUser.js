const FooduserModel = require("../model/userModule");

function getAdminConfig() {
  return {
    email: (process.env.ADMIN_EMAIL || "").toLowerCase().trim(),
    password: process.env.ADMIN_PASSWORD || "",
    name: process.env.ADMIN_NAME || "FoodApp Admin",
  };
}

function isBcryptHash(value) {
  return typeof value === "string" && value.startsWith("$2");
}

async function ensureAdminUser() {
  const { email, password, name } = getAdminConfig();
  if (!email || !password) {
    console.warn("[admin] ADMIN_EMAIL or ADMIN_PASSWORD not set — skipping admin seed");
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
    console.log("[admin] Created admin user:", email);
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
    console.log("[admin] Ensured admin user:", email);
  }

  const demoted = await FooduserModel.updateMany(
    { email: { $ne: email }, role: "admin" },
    { $set: { role: "user" } }
  );
  if (demoted.modifiedCount > 0) {
    console.log("[admin] Removed admin role from", demoted.modifiedCount, "other user(s)");
  }
}

module.exports = { ensureAdminUser, getAdminConfig };
