const express = require("express");
const {
  createBanner,
  getAllBanners,
  saveBanner,
  deleteBanner,
} = require("../controllers/banner");
const { authUser } = require("../middlwares/auth");

const router = express.Router();

router.post("/createBanner", authUser, createBanner);
router.get("/getAllBanners", getAllBanners);
router.put("/saveBanner/:id", authUser, saveBanner);
router.delete("/deleteBanner/:id", authUser, deleteBanner);

module.exports = router;
