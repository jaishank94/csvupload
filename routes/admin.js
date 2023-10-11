const express = require("express");
const adminController = require("../controllers/admin");
const { authUser } = require("../middlwares/auth");

const router = express.Router();

router.post("/admin-login", adminController.adminLogin);
router.post(
  "/admin/events/:eventId/verify-rankings",
  authUser,
  adminController.verifyEventRankings
);
router.get("/disputes", authUser, adminController.viewDisputes);

module.exports = router;
