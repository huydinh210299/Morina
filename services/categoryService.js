const Category = require("../models/Category");
const { setCreateAuditFields, setUpdateAuditFields } = require("../utils/audit");

const findCategoryOrFail = async (id) => {
  const category = await Category.findById(id);

  if (!category) {
    const error = new Error("Không tìm thấy danh mục.");
    error.statusCode = 404;
    throw error;
  }

  return category;
};

const getIndexData = async () => ({
  title: "Danh mục",
  categories: await Category.find().sort({ code: 1 })
});

const getCreateData = () => ({
  title: "Tạo danh mục",
  category: null,
  formAction: "/categories",
  formMethod: "POST"
});

const createCategory = async ({ validatedBody, user }) => {
  await Category.create(setCreateAuditFields(validatedBody, user));

  return {
    successMessage: "Tạo danh mục thành công.",
    redirectTo: "/categories"
  };
};

const getEditData = async (id) => {
  const category = await findCategoryOrFail(id);

  return {
    title: "Chỉnh sửa danh mục",
    category,
    formAction: `/categories/${category._id}?_method=PUT`,
    formMethod: "POST"
  };
};

const updateCategory = async ({ id, validatedBody, user }) => {
  await findCategoryOrFail(id);
  await Category.findByIdAndUpdate(id, setUpdateAuditFields(validatedBody, user), {
    runValidators: true
  });

  return {
    successMessage: "Cập nhật danh mục thành công.",
    redirectTo: "/categories"
  };
};

const deleteCategory = async (id) => {
  await findCategoryOrFail(id);
  await Category.findByIdAndDelete(id);

  return {
    successMessage: "Xóa danh mục thành công.",
    redirectTo: "/categories"
  };
};

module.exports = {
  getIndexData,
  getCreateData,
  createCategory,
  getEditData,
  updateCategory,
  deleteCategory
};
