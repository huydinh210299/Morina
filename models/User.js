const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const timekeepingSchema = new mongoose.Schema({
  shiftId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Shift",
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  approved: {
    type: Boolean,
    default: false
  }
});

const salaryHistorySchema = new mongoose.Schema(
  {
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12
    },
    year: {
      type: Number,
      required: true,
      min: 2000
    },
    salary: {
      type: Number,
      required: true,
      min: 0
    }
  },
  { _id: false }
);

const faultSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
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
  }
});

const commissionSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
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
  approved: {
    type: Boolean,
    default: false
  }
});

const userSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: uuidv4,
      unique: true,
      index: true
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    password: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ["admin", "staff"],
      default: "staff"
    },
    totalOrder: {
      type: Number,
      default: 0,
      min: 0
    },
    timekeeping: {
      type: [timekeepingSchema],
      default: []
    },
    salary: {
      type: [salaryHistorySchema],
      default: []
    },
    faults: {
      type: [faultSchema],
      default: []
    },
    commissions: {
      type: [commissionSchema],
      default: []
    },
    lastAttendanceReminderAt: {
      type: Date,
      default: null
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

module.exports = mongoose.model("User", userSchema);
