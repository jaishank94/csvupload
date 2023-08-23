const cron = require("node-cron");
const Auction = require("../models/Auction");

const updateAuctionStatus = async () => {
  const currentTime = new Date();

  try {
    const expiredAuctions = await Auction.find({
      dateTime: { $lte: currentTime },
      status: { $ne: "Expired" },
    });

    expiredAuctions.forEach(async (auction) => {
      auction.status = "Expired";

      auction.bids.sort((a, b) => b.amount - a.amount);
      auction.eligibleBids = auction.bids.slice(0, auction.numberOfPayers);

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
