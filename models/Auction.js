const mongoose = require("mongoose");

const { ObjectId } = mongoose.Schema;

const auctionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["auction", null],
      default: null,
    },
    text: {
      type: String,
    },
    images: {
      type: Array,
    },
    user: {
      type: ObjectId,
      ref: "User",
      required: true,
    },
    game: {
      type: ObjectId,
      ref: "Game",
      required: true,
    },
    background: {
      type: String,
    },
    basePrice: {
      type: Number,
      required: true,
    },
    numberOfPayers: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
    },
    dateTime: {
      type: Date,
      required: true,
    },
    bids: [
      {
        amount: {
          type: Number,
        },
        image: {
          type: String,
        },
        bidBy: {
          type: ObjectId,
          ref: "User",
        },
        bidAt: {
          type: Date,
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Auction", auctionSchema);
