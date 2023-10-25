const express = require("express");
const dataController = require("../controllers/data");
const multer = require("multer");
const path = require("path");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

app.use(express.static(path.resolve(__dirname, "public")));

const router = express.Router();

var storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

var upload = multer({ storage: storage });

router.get("/data", dataController.getData);
router.post(
  "/upload-data",
  upload.single("csvFile"),
  dataController.uploadData
);

module.exports = router;
