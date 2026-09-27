const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const DB_LINK = process.env.DB_LINK || require("../secrets").DB_LINK;

mongoose
  .connect(DB_LINK, {
    serverSelectionTimeoutMS: 20000,
    family: 4,
  })
  .then(function () {
    console.log("connected");
  })
  .catch(function (err) {
    console.log("error", err.message || err);
    if (err.code === "ETIMEOUT" || String(err.message).includes("querySrv")) {
      console.log(
        "MongoDB DNS timeout — check internet, VPN, firewall, or Atlas cluster not paused."
      );
    }
  });

let userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is not send"],
  },
  password: {
    type: String,
    required: [true, "password is missing"],
  },
  confirmPassword: {
    type: String,
    required: [
      function () {
        return this.isNew || this.isModified("password");
      },
      "confirmPassword is missing",
    ],
    validate: {
      validator: function () {
        return this.password === this.confirmPassword;
      },
      message: "password miss match",
    },
  },
  email: {
    type: String,
    required: [true, "email is missing"],
    unique: true,
  },
  phonenumber: {
    type: String,
    minLength: [10, "less than 10 numbers"],
    maxLength: [10, "less than 10 numbers"],
  },
  pic: {
    type: String,
    default: "dp.png",
  },
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  emailVerificationToken: {
    type: String,
  },
  emailVerificationExpiry: {
    type: Date,
  },
  otp: {
    type: String,
  },
  otpExpiry: {
    type: Date,
  },
  address: {
    type: String,
  },
  location: {
    coordinates: {
      latitude: {
        type: Number,
        min: -90,
        max: 90,
      },
      longitude: {
        type: Number,
        min: -180,
        max: 180,
      },
    },
    address: {
      type: String,
    },
    city: {
      type: String,
    },
    state: {
      type: String,
    },
    country: {
      type: String,
    },
    pincode: {
      type: String,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  bookings: {
    type: [mongoose.Schema.ObjectId],
    ref: "FoodbookingModel",
  },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    this.confirmPassword = undefined;
    return next();
  }
  this.password = await bcrypt.hash(this.password, 12);
  this.confirmPassword = undefined;
  next();
});

userSchema.methods.comparePassword = async function (candidate) {
  if (!candidate || !this.password) return false;
  if (String(this.password).startsWith("$2")) {
    return bcrypt.compare(candidate, this.password);
  }
  // Legacy plaintext (one-time migrate on successful login)
  return candidate === this.password;
};

const FooduserModel = mongoose.model("FooduserModel", userSchema);
module.exports = FooduserModel;
