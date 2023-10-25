const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { readdirSync } = require("fs");
const dotenv = require("dotenv");
const serverless = require("serverless-http");
const userRoute = require("./routes/user");

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

app.get("/hello", async (req, res) => {
  res.send({ msg: "Hello World" });
});

// Start the cron job

//routes
readdirSync("./routes").map((r) => app.use("/", require("./routes/" + r)));
// app.use('/', userRoute);

//database
mongoose.set("strictQuery", true);
mongoose
  .connect(process.env.DATABASE_URL, {
    useNewUrlParser: true, // Use new URL parser
    useUnifiedTopology: true, // Use new Server Discovery and Monitoring engine
    // user: username, // MongoDB username
    // pass: password, // MongoDB password
    // authSource: "$external", // Auth source
    // authMechanism: "MONGODB-AWS", // Auth mechanism
  })
  .then(() => console.log("database connected successfully"))
  .catch((err) => console.log("error connecting to mongodb", err));

if (process.env.ENVIRONMENT === "production") {
  exports.handler = serverless(app);
} else {
  const PORT = process.env.PORT || 8001;
  app.listen(PORT, () => {
    console.log(`server is running on port ${PORT}..`);
  });
}
