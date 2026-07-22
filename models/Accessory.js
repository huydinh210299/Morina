const mongoose = require("mongoose");

const accessorySchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    amount: {
      type: Number,
      default: 0,
      min: 0
    },
    note: {
      type: String,
      default: ""
    },
    imageUrl: {
      type: String,
      default: "",
      trim: true
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

module.exports = mongoose.model("Accessory", accessorySchema);
