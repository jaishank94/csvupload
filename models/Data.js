const mongoose = require("mongoose");

const { ObjectId } = mongoose.Schema;

const dataSchema = new mongoose.Schema({
  data: {
    type: String,
    required: true,
  },
  user: {
    type: ObjectId,
    ref: "User",
    required: true,
  },
});

module.exports = mongoose.model("Data", dataSchema);
