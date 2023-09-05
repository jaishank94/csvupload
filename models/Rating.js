const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const ratingSchema = new mongoose.Schema({
  user: { type: ObjectId, ref: "User", required: true },
  auction: { type: ObjectId, ref: "Auction", required: true },
  rating: { type: Number, required: true },
});

module.exports = mongoose.model("Rating", ratingSchema);
