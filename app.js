const express = require("express");

const  cors = require("cors");
const Razorpay = require("razorpay");
const crypto = require('crypto');

 const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));





// console.log("Hello",process.env);
