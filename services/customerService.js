const mongoose = require("mongoose");
const Customer = require("../models/Customer");
const { customerSchema } = require("../utils/validators");
const validationOptions = require("../utils/validationOptions");

const findCustomerOrFail = async (id) => {
  const customer = mongoose.isObjectIdOrHexString(id) ? await Customer.findById(id) : null;
  if (!customer) {
    const error = new Error("Không tìm thấy khách hàng.");
    error.statusCode = 404;
    throw error;
  }
  return customer;
};

const recordOrder = async ({ phone, customerName }) => {
  const filter = { phone: phone.trim() };
  const update = { $setOnInsert: { name: customerName.trim() }, $inc: { totalOrder: 1 } };
  try {
    await Customer.updateOne(filter, update, { upsert: true, runValidators: true });
  } catch (error) {
    // Concurrent first orders may race to insert the same unique phone.
    if (error.code !== 11000 || !error.keyPattern?.phone) throw error;
    await Customer.updateOne(filter, update, { upsert: true, runValidators: true });
  }
};

const getIndexData = async (query = {}) => {
  const keyword = typeof query.keyword === "string" ? query.keyword.trim() : "";
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const filter = keyword ? { $or: ["name", "phone"].map((field) => ({ [field]: { $regex: escaped, $options: "i" } })) } : {};
  const totalItems = await Customer.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(totalItems / 10));
  const requested = Number.parseInt(query.page, 10);
  const page = Math.min(Math.max(Number.isFinite(requested) ? requested : 1, 1), totalPages);
  return {
    title: "Khách hàng", keyword,
    customers: await Customer.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * 10).limit(10),
    pagination: { page, totalPages, totalItems }
  };
};

const getEditData = async (id) => ({ title: "Chỉnh sửa khách hàng", customer: await findCustomerOrFail(id) });

const updateCustomer = async ({ id, body }) => {
  await findCustomerOrFail(id);
  const { error, value } = customerSchema.validate(body, validationOptions);
  if (error) {
    const validationError = new Error(error.details.map((detail) => detail.message).join(", "));
    validationError.statusCode = 400;
    throw validationError;
  }
  try {
    // Keep the counter out of this update so concurrent orders cannot lose an increment.
    await Customer.findByIdAndUpdate(id, { $set: value }, { runValidators: true });
  } catch (error) {
    if (error.code !== 11000) throw error;
    const duplicateError = new Error("Số điện thoại này đã thuộc về khách hàng khác.");
    duplicateError.statusCode = 400;
    throw duplicateError;
  }
};

const deleteCustomer = async (id) => {
  await findCustomerOrFail(id);
  await Customer.findByIdAndDelete(id);
};

module.exports = { recordOrder, getIndexData, getEditData, updateCustomer, deleteCustomer };
