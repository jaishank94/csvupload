// controllers/paymentController.js
const mongoose = require("mongoose");
const PaymentOrder = require("../models/paymentOrder");
const User = require("../models/User");
const generateUniqueID = require("../helpers/generateUniqueID");

exports.createPaymentOrder = async (req, res) => {
  try {
    const { userId, amount, transactionID } = req.body;

    const orderID = generateUniqueID();

    const paymentOrder = new PaymentOrder({
      orderID,
      amount,
      //   transactionID,
      user: userId,
    });

    await paymentOrder.save();

    res.status(200).json({
      message: "Payment order created successfully",
      order: paymentOrder,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};
