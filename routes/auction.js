const express = require("express");
const {
  createAuction,
  getAllAuctions,
  bid,
  saveAuction,
  deleteAuction,
} = require("../controllers/auction");
const { authUser } = require("../middlwares/auth");

const router = express.Router();

router.post("/createAuction", authUser, createAuction);
router.get("/getAllAuctions", authUser, getAllAuctions);
router.put("/bid", authUser, bid);
router.put("/saveAuction/:id", authUser, saveAuction);
router.delete("/deleteAuction/:id", authUser, deleteAuction);

module.exports = router;
