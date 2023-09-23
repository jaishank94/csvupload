const mongoose = require("mongoose");
const cron = require("node-cron");
const PaymentOrder = require("../models/paymentOrder");
const User = require("../models/User");

// Schedule the cron job to run every minute (adjust the schedule as needed)
cron.schedule("* * * * *", async () => {
  try {
    const pendingOrders = await PaymentOrder.find({ status: "pending" });

    for (const order of pendingOrders) {
      // Simulate a payment gateway response
      const isPaymentSuccessful = simulatePayment(order.transactionID);

      // Check the transaction status from Razorpay and update it in the database
      //   const updatedStatus = await checkRazorpayTransactionStatus(transaction.transactionID);

      //   transaction.status = updatedStatus;
      //   await transaction.save();

      if (isPaymentSuccessful) {
        // Update the order status to 'completed'
        order.status = "completed";
        await order.save();

        // Add the amount to the user's wallet
        const user = await User.findById(order.user);
        user.walletBalance += order.amount;
        await user.save();
      } else {
        // If payment failed, update the order status to 'failed'
        order.status = "failed";
        await order.save();
      }
    }
  } catch (err) {
    console.error("Cron job error:", err);
  }
});

// Function to simulate a payment (replace with actual payment gateway integration)
function simulatePayment(transactionID) {
  // Simulate a successful payment for demonstration purposes
  return true;
}
