const mongoose = require("mongoose");

const noteCategorySchema = new mongoose.Schema(
  {
    categoryCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    displayName: { type: String, required: true, trim: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("NoteCategory", noteCategorySchema);
