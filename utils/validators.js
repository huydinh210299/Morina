const Joi = require("joi");

const userLoginSchema = Joi.object({
  username: Joi.string().trim().required(),
  password: Joi.string().required()
});

const userCreateSchema = Joi.object({
  username: Joi.string().trim().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid("admin", "staff").required(),
  totalOrder: Joi.number().min(0).default(0)
});

const userUpdateSchema = Joi.object({
  username: Joi.string().trim().required(),
  password: Joi.string().min(6).allow(""),
  role: Joi.string().valid("admin", "staff").required(),
  totalOrder: Joi.number().min(0).required()
});

const shiftSchema = Joi.object({
  name: Joi.string().trim().required(),
  hour: Joi.number().min(0).required(),
  salary: Joi.number().min(0).allow(null, ""),
  description: Joi.string().trim().allow("").default("")
});

const timekeepingCreateSchema = Joi.object({
  shiftId: Joi.string().trim().required(),
  date: Joi.date().required()
});

const settingValueSchema = Joi.object({
  value: Joi.number().min(0).required()
});

const payrollPaymentSchema = Joi.object({
  month: Joi.string()
    .pattern(/^\d{4}-\d{2}$/)
    .required()
});

const payrollAdjustmentSchema = Joi.object({
  month: Joi.string()
    .pattern(/^\d{4}-\d{2}$/)
    .allow(""),
  date: Joi.date().required(),
  amount: Joi.number().min(0).required(),
  description: Joi.string().trim().allow("").default("")
});

const financePaymentSchema = Joi.object({
  amount: Joi.number().min(0).required(),
  description: Joi.string().trim().allow("").default("")
});

const categorySchema = Joi.object({
  code: Joi.string().trim().uppercase().required(),
  description: Joi.string().trim().allow("").required()
});

const productSchema = Joi.object({
  code: Joi.string().trim().required(),
  fullDayPrice: Joi.number().min(0).required(),
  eightHPrice: Joi.number().min(0).required(),
  note: Joi.string().trim().allow(""),
  size: Joi.string().trim().allow(""),
  category: Joi.string().trim().required()
});

const accessorySchema = Joi.object({
  code: Joi.string().trim().required(),
  name: Joi.string().trim().required(),
  price: Joi.number().min(0).required()
});

const orderItemSchema = Joi.object({
  product: Joi.string().trim().required(),
  price: Joi.number().min(0).required(),
  useGeneralTimes: Joi.boolean().truthy("on").truthy("true").truthy("1").falsy("off").falsy("false").falsy("0").falsy("").default(true),
  startTime: Joi.date().required(),
  endTime: Joi.date().min(Joi.ref("startTime")).required()
});

const accessoryItemSchema = Joi.object({
  accessory: Joi.string().trim().required(),
  price: Joi.number().min(0).required(),
  useGeneralTimes: Joi.boolean().truthy("on").truthy("true").truthy("1").falsy("off").falsy("false").falsy("0").falsy("").default(true),
  startTime: Joi.date().required(),
  endTime: Joi.date().min(Joi.ref("startTime")).required()
});

const paymentSchema = Joi.object({
  amount: Joi.number().min(0).required(),
  type: Joi.number().valid(0, 1).required()
});

const orderStatusSchema = Joi.object({
  alreadyPickup: Joi.boolean().truthy("on").falsy("off").falsy("").default(false),
  returned: Joi.boolean().truthy("on").falsy("off").falsy("").default(false),
  returnDeposit: Joi.boolean().truthy("on").falsy("off").falsy("").default(false)
});

const orderNoteSchema = Joi.object({
  note: Joi.string().trim().allow("").default("")
});

const orderSchema = Joi.object({
  phone: Joi.string().trim().required(),
  customerName: Joi.string().trim().required(),
  surcharge: Joi.number().min(0).required(),
  deposit: Joi.number().min(0).required(),
  bookship: Joi.boolean().truthy("on").falsy("off").falsy("").default(false),
  important: Joi.boolean().truthy("on").falsy("off").falsy("").default(false),
  note: Joi.string().trim().allow("").default(""),
  orderAmount: Joi.number().min(0).optional(),
  generalStartTime: Joi.date().required(),
  generalEndTime: Joi.date().min(Joi.ref("generalStartTime")).required(),
  alreadyPickup: Joi.boolean().truthy("on").falsy("off").falsy("").default(false),
  returned: Joi.boolean().truthy("on").falsy("off").falsy("").default(false),
  returnDeposit: Joi.boolean().truthy("on").falsy("off").falsy("").default(false),
  products: Joi.array().items(orderItemSchema).default([]),
  accessories: Joi.array().items(accessoryItemSchema).default([]),
  payments: Joi.array().items(paymentSchema).default([])
});

module.exports = {
  userLoginSchema,
  userCreateSchema,
  userUpdateSchema,
  shiftSchema,
  timekeepingCreateSchema,
  settingValueSchema,
  payrollPaymentSchema,
  payrollAdjustmentSchema,
  financePaymentSchema,
  categorySchema,
  productSchema,
  accessorySchema,
  orderSchema,
  paymentSchema,
  orderStatusSchema,
  orderNoteSchema
};
