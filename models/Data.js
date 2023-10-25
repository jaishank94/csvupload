const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const { ObjectId } = mongoose.Schema;

const dataSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    data: {
      type: String,
    },
    user: {
      type: ObjectId,
      ref: "User",
    },
    status: {
      type: String,
      enum: ["ACTIVE", "IN-ACTIVE"],
      default: "ACTIVE",
    },
  },
  {
    timestamps: true,
  }
);

// Apply the pagination plugin
dataSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("Data", dataSchema);
