const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const { ObjectId } = mongoose.Schema;

const eventSchema = new mongoose.Schema(
  {
    title: {
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
    ticketPrice: {
      type: Number,
      required: true,
    },
    gender: {
      type: String,
      // required: true,
    },
    numberOfTickets: {
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
    eventMembers: [
      {
        amount: {
          type: Number,
        },
        image: {
          type: String,
        },
        user: {
          type: ObjectId,
          ref: "User",
          required: true,
        },
        createdAt: {
          type: Date,
          required: true,
        },
        ranking: {
          type: Number, // Add this field to store rankings
          default: 0, // Initialize with 0
        },
      },
    ],
    winner: {
      type: ObjectId,
      ref: "User",
    },
    rankingsScreenshotUrl: {
      type: String,
    },
    verified: {
      type: Boolean,
    },
    donations: [
      {
        type: {
          type: String,
          enum: ["host", "player", "winner"],
          default: "host",
        },
        donationReceiver: {
          type: ObjectId,
          ref: "User",
        },
        amount: {
          type: Number,
        },
        image: {
          type: String,
        },
        user: {
          type: ObjectId,
          ref: "User",
          required: true,
        },
        createdAt: {
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
eventSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("Event", eventSchema);
