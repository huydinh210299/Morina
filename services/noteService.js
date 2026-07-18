const Note = require("../models/Note");
const NoteCategory = require("../models/NoteCategory");
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

const getIndexData = async (query = {}) => {
  const keyword = `${query.keyword || ""}`.trim();
  const categoryId = `${query.categoryId || ""}`.trim();
  const filter = {};
  if (keyword) filter.$or = [{ title: { $regex: keyword, $options: "i" } }, { description: { $regex: keyword, $options: "i" } }];
  if (categoryId) filter.categoryId = categoryId;
  const totalItems = await Note.countDocuments(filter);
  const pagination = buildPagination(query.page, totalItems);
  return {
    title: "Ghi chú",
    notes: await Note.find(filter).populate("categoryId").sort({ createdAt: -1 }).skip((pagination.page - 1) * PAGE_SIZE).limit(PAGE_SIZE),
    categories: await getCategories(),
    filters: { keyword, categoryId },
    pagination
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

module.exports = { getIndexData, getCreateData, createNote, getEditData, updateNote, deleteNote };
