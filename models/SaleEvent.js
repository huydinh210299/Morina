const mongoose = require("mongoose");

const saleEventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      required: true
    },
    description: {
      type: String,
      trim: true,
      required: true
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      required: true,
      index: true
    },
    createdBy: {
      type: String,
      required: true
    },
    updatedBy: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true
  }
);

saleEventSchema.index({ status: 1, updatedAt: -1 });

module.exports = mongoose.model("SaleEvent", saleEventSchema);
