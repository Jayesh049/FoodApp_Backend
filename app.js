const express = require("express");

import cors from "cors";
const Razorpay = require("razorpay");
const crypto = require('crypto');

export const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));





// console.log("Hello",process.env);
