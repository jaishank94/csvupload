const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const { ObjectId } = mongoose.Schema;

const dataSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    Valuation: {
      type: Number,
    },
    LastFundingType: {
      type: String,
    },
    LastFundingDate: {
      type: String,
    },
    LastFundingAmountMUSD: {
      type: Number,
    },
    Founded: {
      type: String,
    },
    Headquarters: {
      type: String,
    },
    Industries: {
      type: String,
    },
    TotalFundingAmountMUSD: {
      type: Number,
    },
    Investors: {
      type: String,
    },
    Founders: {
      type: String,
    },
    Employees: {
      type: String,
    },
    data: {
      type: String,
    },
    Website: {
      type: String,
    },
    Description: {
      type: String,
    },
    category: [String],
    subcategory: [String],
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
