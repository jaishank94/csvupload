const express = require("express");
const {
  createAuction,
  getAllAuctions,
  bid,
  saveAuction,
  deleteAuction,
  searchAuctions,
  createRating,
  updateAuction,
  getAuctionsByUser,
  cancelAuction,
} = require("../controllers/auction");
const { authUser } = require("../middlwares/auth");

const router = express.Router();

router.post("/createAuction", authUser, createAuction);
router.post("/getAllAuctions", authUser, getAllAuctions);
router.put("/bid", authUser, bid);
router.put("/saveAuction/:id", authUser, saveAuction);
router.get("//auctions/by-user/:userId", getAuctionsByUser);
router.put("/auctions/:auctionId", authUser, updateAuction);
router.put("/auctions/cancel/:auctionId", authUser, cancelAuction);
router.get("/searchAuctions", authUser, searchAuctions);
router.post("/auctions/createRating", authUser, createRating);
router.delete("/deleteAuction/:id", authUser, deleteAuction);

module.exports = router;
