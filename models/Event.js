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
        image: {
          type: String,
        },
        user: {
          type: ObjectId,
          ref: "User",
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
