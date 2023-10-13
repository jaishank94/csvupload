// controllers/paymentController.js
const mongoose = require("mongoose");
const PaymentOrder = require("../models/paymentOrder");
const User = require("../models/User");
const generateUniqueID = require("../helpers/generateUniqueID");
const stripe = require("stripe")(
  "sk_test_51M6UVmSA1CggwQAXcM5Pd85IGKpJbvipXI3Vc8mr466lFEH49hXU5nqjcvnStjeRQveIk2wzghrUNrulpMxoAem700CCMkWZbz"
);
const paypal = require("paypal-rest-sdk");

exports.charge = async (req, res) => {
  const { amount, source, description } = req.body;

  try {
    const charge = await stripe.charges.create({
      amount,
      currency: "USD",
      source,
      description,
    });
    res.json(charge);
  } catch (error) {
    res.status(500).json(error);
  }
};

exports.createPaymentIntent = async (req, res) => {
  try {
    const { amount, currency } = req.body;

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createPayment = (req, res) => {
  const { amount, description } = req.body;

  const createPaymentJson = {
    intent: "sale",
    payer: {
      payment_method: "paypal",
    },
    redirect_urls: {
      return_url: process.env.PAYPAL_RETURN_URL,
      cancel_url: process.env.PAYPAL_CANCEL_URL,
    },
    transactions: [
      {
        amount: {
          total: amount,
          currency: "USD",
        },
        description,
      },
    ],
  };

  paypal.payment.create(createPaymentJson, (error, payment) => {
    if (error) {
      res.status(500).json({ error: error.response });
    } else {
      for (let link of payment.links) {
        if (link.method === "REDIRECT") {
          return res.redirect(link.href);
        }
      }
    }
  });
};

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
