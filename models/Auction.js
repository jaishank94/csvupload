const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

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
    gender: {
      type: String,
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
    status: {
      type: String,
      default: "ACTIVE",
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
    ratings: [{ type: ObjectId, ref: "Rating" }],
    eligibleBids: [
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

// Apply the pagination plugin
auctionSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("Auction", auctionSchema);
