const express = require("express");
const adminController = require("../controllers/admin");
const { authUser } = require("../middlwares/auth");

const router = express.Router();

router.post("/admin-login", adminController.adminLogin);

module.exports = router;
