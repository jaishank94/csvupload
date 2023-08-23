const express = require("express");
const walletController = require("../controllers/wallet");

const router = express.Router();

router.post("/addBalance", walletController.addBalance);
router.post("/requestWithdrawal", walletController.requestWithdrawal);
router.get("/getEarnings", walletController.getEarnings);
router.get("/getTransactionLogs", walletController.getTransactionLogs);

module.exports = router;
