const express = require("express");
const dataController = require("../controllers/data");
const multer = require("multer");

const router = express.Router();

var storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "../public/uploads");
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

var upload = multer({ storage: storage });

router.get("/data", dataController.getData);
router.post("/upload-data", upload.single("file"), dataController.uploadData);

module.exports = router;
