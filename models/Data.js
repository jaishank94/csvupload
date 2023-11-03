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
    Employees: {
      type: String,
    },
    Founded: {
      type: Date,
    },
    Founders: {
      type: String,
    },
    Valuation: {
      type: Number,
    },
    Website: {
      type: String,
    },
    LastFundingType: {
      type: String,
    },
    LastFundingDate: {
      type: Date,
    },
    LastFundingAmountMUSD: {
      type: Number,
    },
    Headquarters: {
      type: String,
    },
    Industries: {
      type: String,
    },
    Description: {
      type: String,
    },
    TotalFundingAmountMUSD: {
      type: Number,
    },
    Investors: {
      type: String,
    },
    category: {
      type: String,
    },
    subcategory: {
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
