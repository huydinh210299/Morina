const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const shiftSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: uuidv4,
      unique: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    hour: {
      type: Number,
      required: true,
      min: 0
    },
    salary: {
      type: Number,
      min: 0,
      default: null
    },
    description: {
      type: String,
      trim: true,
      default: ""
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

module.exports = mongoose.model("Shift", shiftSchema);
