// routes/paymentRoutes.js
const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/payment");
const { authUser } = require("../middlwares/auth");

// Create a payment order
router.post("/payment-orders", authUser, paymentController.createPaymentOrder);

module.exports = router;
