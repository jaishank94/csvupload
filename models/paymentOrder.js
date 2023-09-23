// models/paymentOrder.js
const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const paymentOrderSchema = new mongoose.Schema(
  {
    orderID: {
      type: String,
      unique: true,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    transactionID: String,
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    user: {
      type: ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PaymentOrder", paymentOrderSchema);
