const express = require("express");
const adminController = require("../controllers/admin");
const { authUser } = require("../middlwares/auth");

const router = express.Router();

router.post("/admin-login", adminController.adminLogin);
// router.post(
//   "/admin/events/:eventId/verify-rankings",
//   authUser,
//   adminController.verifyEventRankings
// );
router.get("/disputes", authUser, adminController.viewDisputes);

router.put(
  "/event/:eventId/dispute/:disputeId/initiate-refund",
  authUser,
  adminController.initiateRefund
);

router.put(
  "/event/:eventId/dispute/:disputeId/hold-event",
  authUser,
  adminController.holdEvent
);

router.put(
  "/event/:eventId/dispute/:disputeId/close-dispute",
  authUser,
  adminController.closeDispute
);

router.put(
  "/event/:eventId/dispute/:disputeId/ask-host-to-reupload",
  authUser,
  adminController.askHostToReuploadResults
);

module.exports = router;
