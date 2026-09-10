const mongoose = require("mongoose");

const financeEntrySchema = new mongoose.Schema(
  {
    entryType: {
      type: String,
      enum: ["income", "expense"],
      required: true,
      index: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    description: {
      type: String,
      trim: true,
      default: ""
    },
    transactionDate: {
      type: Date,
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

financeEntrySchema.index({ transactionDate: -1, entryType: 1 });

module.exports = mongoose.model("FinanceEntry", financeEntrySchema);
