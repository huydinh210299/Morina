const mongoose = require("mongoose");
const Note = require("../models/Note");
const NoteCategory = require("../models/NoteCategory");
const SaleEvent = require("../models/SaleEvent");
const { setCreateAuditFields, setUpdateAuditFields } = require("../utils/audit");

const PAGE_SIZE = 10;

const buildPagination = (requestedPage, totalItems) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const page = Math.min(Math.max(Number.parseInt(requestedPage, 10) || 1, 1), totalPages);
  return { page, totalItems, totalPages, hasPrev: page > 1, hasNext: page < totalPages, prevPage: page - 1, nextPage: page + 1 };
};

const findNoteOrFail = async (id) => {
  const note = await Note.findById(id);
  if (!note) {
    const error = new Error("Không tìm thấy ghi chú.");
    error.statusCode = 404;
    throw error;
  }
  return note;
};

const ensureCategoryExists = async (categoryId) => {
  if (!(await NoteCategory.exists({ _id: categoryId }))) {
    const error = new Error("Danh mục ghi chú đã chọn không hợp lệ.");
    error.statusCode = 400;
    throw error;
  }
};

const getCategories = () => NoteCategory.find().sort({ categoryCode: 1 });

const buildSaleEventRedirect = ({ eventPage }) => `/notes?tab=events&eventPage=${eventPage}`;

const findSaleEventOrFail = async (id) => {
  if (!mongoose.isValidObjectId(id)) {
    const error = new Error("Không tìm thấy sự kiện sale.");
    error.statusCode = 404;
    throw error;
  }
  const event = await SaleEvent.findById(id);
  if (!event) {
    const error = new Error("Không tìm thấy sự kiện sale.");
    error.statusCode = 404;
    throw error;
  }
  return event;
};

const getSaleEventManagementData = async (query = {}) => {
  const totalItems = await SaleEvent.countDocuments();
  const pagination = buildPagination(query.eventPage, totalItems);
  const editingEvent = query.eventEdit && mongoose.isValidObjectId(query.eventEdit)
    ? await SaleEvent.findById(query.eventEdit)
    : null;

  return {
    events: await SaleEvent.find().sort({ updatedAt: -1, createdAt: -1 }).skip((pagination.page - 1) * PAGE_SIZE).limit(PAGE_SIZE),
    pagination,
    editingEvent
  };
};

const getIndexData = async (query = {}, user) => {
  const keyword = `${query.keyword || ""}`.trim();
  const categoryId = `${query.categoryId || ""}`.trim();
  const activeTab = query.tab === "events" && user?.role === "admin" ? "events" : "notes";
  const filter = {};
  if (keyword) filter.$or = [{ title: { $regex: keyword, $options: "i" } }, { description: { $regex: keyword, $options: "i" } }];
  if (categoryId) filter.categoryId = categoryId;
  const [totalItems, categories, saleEventManagement] = await Promise.all([
    Note.countDocuments(filter),
    getCategories(),
    user?.role === "admin" ? getSaleEventManagementData(query) : Promise.resolve(null)
  ]);
  const pagination = buildPagination(query.page, totalItems);
  return {
    title: "Ghi chú",
    notes: await Note.find(filter).populate("categoryId").sort({ createdAt: -1 }).skip((pagination.page - 1) * PAGE_SIZE).limit(PAGE_SIZE),
    categories,
    filters: { keyword, categoryId },
    pagination,
    activeTab,
    saleEventManagement
  };
};

const getCreateData = async () => ({ title: "Tạo ghi chú", note: null, categories: await getCategories(), formAction: "/notes", formMethod: "POST" });

const createNote = async ({ validatedBody, user }) => {
  await ensureCategoryExists(validatedBody.categoryId);
  await Note.create(setCreateAuditFields(validatedBody, user));
  return { successMessage: "Tạo ghi chú thành công.", redirectTo: "/notes" };
};

const getEditData = async (id) => ({ title: "Chỉnh sửa ghi chú", note: await findNoteOrFail(id), categories: await getCategories(), formAction: `/notes/${id}?_method=PUT`, formMethod: "POST" });

const updateNote = async ({ id, validatedBody, user }) => {
  await findNoteOrFail(id);
  await ensureCategoryExists(validatedBody.categoryId);
  await Note.findByIdAndUpdate(id, setUpdateAuditFields(validatedBody, user), { runValidators: true });
  return { successMessage: "Cập nhật ghi chú thành công.", redirectTo: "/notes" };
};

const deleteNote = async (id) => {
  await findNoteOrFail(id);
  await Note.findByIdAndDelete(id);
  return { successMessage: "Xóa ghi chú thành công.", redirectTo: "/notes" };
};

const createSaleEvent = async ({ validatedBody, user, query }) => {
  await SaleEvent.create(setCreateAuditFields(validatedBody, user));
  return { successMessage: "Tạo sự kiện sale thành công.", redirectTo: buildSaleEventRedirect({ eventPage: Math.max(Number.parseInt(query.eventPage, 10) || 1, 1) }) };
};

const updateSaleEvent = async ({ id, validatedBody, user, query }) => {
  await findSaleEventOrFail(id);
  await SaleEvent.findByIdAndUpdate(id, setUpdateAuditFields(validatedBody, user), { runValidators: true });
  return { successMessage: "Cập nhật sự kiện sale thành công.", redirectTo: buildSaleEventRedirect({ eventPage: Math.max(Number.parseInt(query.eventPage, 10) || 1, 1) }) };
};

const deleteSaleEvent = async ({ id, query }) => {
  await findSaleEventOrFail(id);
  await SaleEvent.findByIdAndDelete(id);
  return { successMessage: "Xóa sự kiện sale thành công.", redirectTo: buildSaleEventRedirect({ eventPage: Math.max(Number.parseInt(query.eventPage, 10) || 1, 1) }) };
};

module.exports = { getIndexData, getCreateData, createNote, getEditData, updateNote, deleteNote, createSaleEvent, updateSaleEvent, deleteSaleEvent };
