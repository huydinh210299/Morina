const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const orderLineSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product"
    },
    accessory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Accessory"
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    useGeneralTimes: {
      type: Boolean,
      default: true
    },
    startTime: {
      type: Date,
      required: true
    },
    endTime: {
      type: Date,
      required: true
    }
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    type: {
      type: Number,
      enum: [0, 1],
      required: true
    }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: uuidv4,
      unique: true,
      index: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    customerName: {
      type: String,
      required: true,
      trim: true
    },
    orderAmount: {
      type: Number,
      required: true,
      min: 0
    },
    surcharge: {
      type: Number,
      default: 0,
      min: 0
    },
    deposit: {
      type: Number,
      default: 0,
      min: 0
    },
    bookship: {
      type: Boolean,
      default: false
    },
    important: {
      type: Boolean,
      default: false
    },
    note: {
      type: String,
      trim: true,
      default: ""
    },
    products: [orderLineSchema],
    accessories: [orderLineSchema],
    generalStartTime: {
      type: Date,
      required: true
    },
    generalEndTime: {
      type: Date,
      required: true
    },
    payments: [paymentSchema],
    alreadyPickup: {
      type: Boolean,
      default: false
    },
    returned: {
      type: Boolean,
      default: false
    },
    returnDeposit: {
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

module.exports = mongoose.model("Order", orderSchema);
