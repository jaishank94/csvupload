const cron = require("node-cron");
const Auction = require("../models/Auction");
const User = require("../models/User");

const updateAuctionStatus = async () => {
  const currentTime = new Date();

  try {
    const expiredAuctions = await Auction.find({
      dateTime: { $lte: currentTime },
      status: { $ne: "EXPIRED" },
    });

    expiredAuctions.forEach(async (auction) => {
      auction.status = "EXPIRED";

      auction.bids.sort((a, b) => b.amount - a.amount);
      auction.eligibleBids = auction.bids.slice(0, auction.numberOfPayers);

      for (const bid of auction.bids) {
        const user = await User.findById(bid.user);

        if (
          !auction.eligibleBids.some((topBid) => topBid._id.equals(bid._id))
        ) {
          // Release blocked amount for non-winning bids
          user.blockedBalance -= bid.amount;
          user.balance += bid.amount;
          await user.save();
        }
      }

      await auction.save();
    });
  } catch (error) {
    console.error("Error updating auctions:", error);
  }
};

// Schedule the cron job
cron.schedule("*/2 * * * * *", () => {
  console.log("Running cron job...");
  updateAuctionStatus();
});
