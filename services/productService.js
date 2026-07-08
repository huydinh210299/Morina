const Product = require("../models/Product");
const Category = require("../models/Category");
const Order = require("../models/Order");
const mongoose = require("mongoose");
const { setCreateAuditFields, setUpdateAuditFields } = require("../utils/audit");

const PAGE_SIZE = 10;

const getCategories = () => Category.find().sort({ code: 1 });

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const findProductOrFail = async (id) => {
  const product = await Product.findById(id);

  if (!product) {
    const error = new Error("Không tìm thấy sản phẩm.");
    error.statusCode = 404;
    throw error;
  }

  return product;
};

const getIndexData = async (query = {}) => {
  const requestedPage = Math.max(parseInt(query.page, 10) || 1, 1);
  const filters = {
    category: query.category?.trim() || "",
    productCode: query.productCode?.trim() || ""
  };
  const conditions = {
    isDeleted: false
  };

  if (filters.category) {
    if (!mongoose.Types.ObjectId.isValid(filters.category)) {
      return {
        title: "Sản phẩm",
        products: [],
        categories: await getCategories(),
        filters,
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          pageSize: PAGE_SIZE,
          hasPrev: false,
          hasNext: false,
          prevPage: 0,
          nextPage: 2
        }
      };
    }

    conditions.category = filters.category;
  }

  if (filters.productCode) {
    conditions.code = {
      $regex: escapeRegex(filters.productCode),
      $options: "i"
    };
  }

  const [categories, totalItems] = await Promise.all([
    getCategories(),
    Product.countDocuments(conditions)
  ]);

  const totalPages = Math.max(Math.ceil(totalItems / PAGE_SIZE), 1);
  const currentPage = Math.min(requestedPage, totalPages);
  const products = await Product.find(conditions)
    .populate("category")
    .sort({ code: 1 })
    .skip((currentPage - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE);

  return {
    title: "Sản phẩm",
    products,
    categories,
    filters,
    pagination: {
      currentPage,
      totalPages,
      totalItems,
      pageSize: PAGE_SIZE,
      hasPrev: currentPage > 1,
      hasNext: currentPage < totalPages,
      prevPage: currentPage - 1,
      nextPage: currentPage + 1
    }
  };
};

const getCreateData = async () => ({
  title: "Tạo sản phẩm",
  product: null,
  categories: await getCategories(),
  formAction: "/products",
  formMethod: "POST"
});

const createProduct = async ({ validatedBody, user }) => {
  await Product.create(setCreateAuditFields(validatedBody, user));

  return {
    successMessage: "Tạo sản phẩm thành công.",
    redirectTo: "/products"
  };
};

const getEditData = async (id) => {
  const [product, categories] = await Promise.all([findProductOrFail(id), getCategories()]);

  return {
    title: "Chỉnh sửa sản phẩm",
    product,
    categories,
    formAction: `/products/${product._id}?_method=PUT`,
    formMethod: "POST"
  };
};

const getShowData = async (id) => {
  const product = await Product.findById(id).populate("category");

  if (!product || product.isDeleted) {
    const error = new Error("Không tìm thấy sản phẩm.");
    error.statusCode = 404;
    throw error;
  }

  return {
    title: `Sản phẩm ${product.code}`,
    product
  };
};

const getScheduleData = async (id) => {
  const product = await Product.findById(id).populate("category");

  if (!product || product.isDeleted) {
    const error = new Error("Không tìm thấy sản phẩm.");
    error.statusCode = 404;
    throw error;
  }

  const orders = await Order.find({
    returned: false,
    "products.product": product._id
  })
    .sort({ generalStartTime: 1 })
    .select("id customerName phone generalStartTime generalEndTime products");

  const rentSchedule = orders
    .flatMap((order) =>
      order.products
        .filter((item) => item.product && item.product.toString() === product._id.toString())
        .map((item) => ({
          orderId: order._id,
          orderCode: order.id,
          customerName: order.customerName,
          phone: order.phone,
          startTime: item.startTime,
          endTime: item.endTime,
          generalStartTime: order.generalStartTime,
          generalEndTime: order.generalEndTime
        }))
    )
    .sort((left, right) => new Date(left.startTime) - new Date(right.startTime));

  const now = new Date();
  const currentRentCount = rentSchedule.filter(
    (item) => new Date(item.startTime) <= now && new Date(item.endTime) >= now
  ).length;
  const upcomingRentCount = rentSchedule.filter((item) => new Date(item.startTime) > now).length;

  return {
    title: `Lich thue ${product.code}`,
    product,
    rentSchedule,
    currentRentCount,
    upcomingRentCount
  };
};

const updateProduct = async ({ id, validatedBody, user }) => {
  await findProductOrFail(id);
  await Product.findByIdAndUpdate(id, setUpdateAuditFields(validatedBody, user), {
    runValidators: true
  });

  return {
    successMessage: "Cập nhật sản phẩm thành công.",
    redirectTo: "/products"
  };
};

const archiveProduct = async ({ id, user }) => {
  await findProductOrFail(id);
  await Product.findByIdAndUpdate(id, setUpdateAuditFields({ isDeleted: true }, user));

  return {
    successMessage: "Lưu trữ sản phẩm thành công.",
    redirectTo: "/products"
  };
};

module.exports = {
  getIndexData,
  getCreateData,
  createProduct,
  getEditData,
  getShowData,
  getScheduleData,
  updateProduct,
  archiveProduct
};
