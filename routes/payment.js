// routes/paymentRoutes.js
const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/payment");
const { authUser } = require("../middlwares/auth");

// Create a payment order
router.post("/payment-orders", authUser, paymentController.createPaymentOrder);

router.post("/stripe/charge", paymentController.charge);

router.post(
  "/stripe/create-payment-intent",
  paymentController.createPaymentIntent
);

router.post("/paypal/create-payment", paymentController.createPayment);

module.exports = router;
