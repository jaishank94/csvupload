const express = require("express");
const dataController = require("../controllers/data");

const router = express.Router();

router.get("/data", dataController.getData);

module.exports = router;
