const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true, unique: true },
  totalOrder: {
    type: Number,
    default: 0,
    min: 0,
    validate: { validator: Number.isSafeInteger, message: "Số lần đặt hàng phải là số nguyên không âm." }
  }
}, { timestamps: true });

module.exports = mongoose.model("Customer", customerSchema);
