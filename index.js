const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const fileUpload = require("express-fileupload");
const { readdirSync } = require("fs");
const dotenv = require("dotenv");
const serverless = require("serverless-http")
const userRoute = require('./routes/user')
dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(
  fileUpload({
    useTempFiles: true,
  })
);

app.get("/hello", async (req, res) => {
  res.send({msg: "Hello World"})
})
// Start the cron job
require("./crons/auctionCron.js");

//routes
readdirSync("./routes").map((r) => app.use("/", require("./routes/" + r)));
// app.use('/', userRoute);

//database
mongoose.set("strictQuery", true);
mongoose
  .connect(process.env.DATABASE_URL)
  .then(() => console.log("database connected successfully"))
  .catch((err) => console.log("error connecting to mongodb", err));

if (process.env.ENVIRONMENT === "production") {
  exports.handler = serverless(app);
  // module.exports = app;
} else {
  const PORT = process.env.PORT || 8000;
  app.listen(PORT, () => {
    console.log(`server is running on port ${PORT}..`);
  });
}
