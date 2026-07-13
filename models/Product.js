const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    fullDayPrice: {
      type: Number,
      required: true,
      min: 0
    },
    eightHPrice: {
      type: Number,
      required: true,
      min: 0
    },
    note: {
      type: String,
      default: ""
    },
    size: {
      type: String,
      default: ""
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true
    },
    orderCount: {
      type: Number,
      default: 0,
      min: 0
    },
    isDeleted: {
      type: Boolean,
      default: false
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

module.exports = mongoose.model("Product", productSchema);
