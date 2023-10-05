const cron = require("node-cron");
const Event = require("../models/Event");
const User = require("../models/User");

const updateEventStatus = async () => {
  const currentTime = new Date();

  try {
    const expiredEvents = await Event.find({
      dateTime: { $lte: currentTime },
      status: "ACTIVE", // Filter by status equal to "ACTIVE"
    });

    expiredEvents.forEach(async (event) => {
      event.status = "IN-PROGRESS";

      event.bids.sort((a, b) => b.amount - a.amount);
      event.eligibleBids = event.bids.slice(0, event.numberOfPayers);

      for (const bid of event.bids) {
        const user = await User.findById(bid.user);

        if (!event.eligibleBids.some((topBid) => topBid._id.equals(bid._id))) {
          // Release blocked amount for non-winning bids
          user.blockedBalance -= bid.amount;
          user.balance += bid.amount;
          await user.save();
        }
      }

      await event.save();
    });
  } catch (error) {
    console.error("Error updating events:", error);
  }
};

// Schedule the cron job
cron.schedule("*/2 * * * * *", () => {
  console.log("Running event cron job...");
  updateEventStatus();
});
