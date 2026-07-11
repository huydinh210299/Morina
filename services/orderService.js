const Order = require("../models/Order");
const Product = require("../models/Product");
const Accessory = require("../models/Accessory");
const User = require("../models/User");
const { parseOrderPayload } = require("../utils/requestParsers");
const { orderSchema, paymentSchema, orderStatusSchema } = require("../utils/validators");
const { setCreateAuditFields, setUpdateAuditFields } = require("../utils/audit");
const { USER_ROLES } = require("../utils/constants");

const PAGE_SIZE = 10;
const STATUS_FILTER_ALL = "all";
const STATUS_FILTER_TRUE = "true";
const STATUS_FILTER_FALSE = "false";

const findOrderOrFail = async (id) => {
  const order = await Order.findById(id);

  if (!order) {
    const error = new Error("Không tìm thấy đơn hàng.");
    error.statusCode = 404;
    throw error;
  }

  return order;
};

const getOrderDependencies = async () => {
  const [products, accessories] = await Promise.all([
    Product.find({ isDeleted: false }).sort({ code: 1 }),
    Accessory.find().sort({ code: 1 })
  ]);

  return { products, accessories };
};

const buildProductLabel = (product) => [product?.code, product?.size, product?.note].filter(Boolean).join(" - ");

const buildValidatedOrder = (body) => {
  const payload = parseOrderPayload(body);
  const applyGeneralTimes = (items = []) =>
    items.map((item) => {
      const useGeneralTimes = ["on", "true", "1", true].includes(item.useGeneralTimes);

      if (!useGeneralTimes) {
        return item;
      }

      return {
        ...item,
        useGeneralTimes,
        startTime: payload.generalStartTime,
        endTime: payload.generalEndTime
      };
    });

  payload.products = applyGeneralTimes(payload.products);
  payload.accessories = applyGeneralTimes(payload.accessories);

  const { error, value } = orderSchema.validate(payload, {
    abortEarly: false,
    convert: true
  });

  if (error) {
    const validationError = new Error(error.details.map((detail) => detail.message).join(", "));
    validationError.statusCode = 400;
    throw validationError;
  }

  return value;
};

const validatePayload = (schema, payload) => {
  const { error, value } = schema.validate(payload, {
    abortEarly: false,
    convert: true
  });

  if (error) {
    const validationError = new Error(error.details.map((detail) => detail.message).join(", "));
    validationError.statusCode = 400;
    throw validationError;
  }

  return value;
};

const calculateOrderAmount = (payload) => {
  const productTotal = payload.products.reduce((sum, item) => sum + Number(item.price), 0);
  const accessoryTotal = payload.accessories.reduce((sum, item) => sum + Number(item.price), 0);
  return productTotal + accessoryTotal + Number(payload.surcharge || 0);
};

const getMonthRange = (date = new Date()) => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  end.setHours(0, 0, 0, 0);

  return { start, end };
};

const formatDateInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseCheckbox = (value) => ["on", "true", "1", true].includes(value);

const toDayStart = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const rangesOverlap = (startA, endA, startB, endB) =>
  toDayStart(startA).getTime() <= toDayStart(endB).getTime() &&
  toDayStart(endA).getTime() >= toDayStart(startB).getTime();

const buildConflictMessage = (conflicts = []) => {
  if (!conflicts.length) {
    return "";
  }

  const productLabels = [...new Set(conflicts.map((conflict) => conflict.productLabel).filter(Boolean))];
  const preview = productLabels.slice(0, 3).join(", ");
  const suffix = productLabels.length > 3 ? ` và ${productLabels.length - 3} sản phẩm khác` : "";

  return `Có sản phẩm đã được lên kế hoạch thuê trong khoảng thời gian này (${preview}${suffix}). Hãy xác nhận nếu vẫn muốn lưu đơn hàng.`;
};

const findConflictingProductLines = async ({ payload, excludeOrderId }) => {
  const requestedProducts = payload.products.filter((item) => item.product);
  const productIds = [...new Set(requestedProducts.map((item) => `${item.product}`))];

  if (!productIds.length) {
    return [];
  }

  const filter = {
    returned: false,
    "products.product": { $in: productIds }
  };

  if (excludeOrderId) {
    filter._id = { $ne: excludeOrderId };
  }

  const orders = await Order.find(filter)
    .populate("products.product")
    .select("id customerName products");

  const conflicts = [];

  for (const requestedItem of requestedProducts) {
    const requestedProductId = `${requestedItem.product}`;

    for (const order of orders) {
      for (const existingItem of order.products) {
        const existingProductId = `${existingItem.product?._id || existingItem.product || ""}`;

        if (existingProductId !== requestedProductId) {
          continue;
        }

        if (!rangesOverlap(requestedItem.startTime, requestedItem.endTime, existingItem.startTime, existingItem.endTime)) {
          continue;
        }

        conflicts.push({
          productId: requestedProductId,
          productLabel: buildProductLabel(existingItem.product),
          orderId: `${order._id}`,
          orderCode: order.id,
          customerName: order.customerName,
          requestedStartTime: requestedItem.startTime,
          requestedEndTime: requestedItem.endTime,
          startTime: existingItem.startTime,
          endTime: existingItem.endTime
        });
      }
    }
  }

  return conflicts.sort((left, right) => new Date(left.startTime) - new Date(right.startTime));
};

const ensureOrderConflictConfirmed = async ({ body, payload, excludeOrderId }) => {
  const conflicts = await findConflictingProductLines({ payload, excludeOrderId });

  if (!conflicts.length || parseCheckbox(body.conflictOverride)) {
    return conflicts;
  }

  const error = new Error(buildConflictMessage(conflicts));
  error.statusCode = 409;
  error.conflicts = conflicts;
  throw error;
};

const parseStatusFilter = (value) => {
  if (value === true || value === "true" || value === "1" || value === 1) {
    return STATUS_FILTER_TRUE;
  }

  if (value === false || value === "false" || value === "0" || value === 0) {
    return STATUS_FILTER_FALSE;
  }

  return STATUS_FILTER_ALL;
};

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const clampDate = (date, minDate, maxDate) => {
  if (date < minDate) {
    return new Date(minDate);
  }

  if (date > maxDate) {
    return new Date(maxDate);
  }

  return new Date(date);
};

const getDayRange = (date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

const buildOrderFilters = (query = {}) => {
  const { start, end } = getMonthRange();
  const defaultEndDate = new Date(end);
  defaultEndDate.setDate(defaultEndDate.getDate() - 1);
  defaultEndDate.setHours(0, 0, 0, 0);

  const filters = {
    phone: typeof query.phone === "string" ? query.phone.trim() : "",
    rentStartDate: typeof query.rentStartDate === "string" && query.rentStartDate ? query.rentStartDate : formatDateInput(start),
    rentEndDate:
      typeof query.rentEndDate === "string" && query.rentEndDate ? query.rentEndDate : formatDateInput(defaultEndDate),
    todayOrders: parseCheckbox(query.todayOrders),
    tomorrowOrders: parseCheckbox(query.tomorrowOrders),
    important: parseCheckbox(query.important),
    excludeCompletedImportant: parseCheckbox(query.excludeCompletedImportant),
    bookship: parseStatusFilter(query.bookship),
    returned: parseStatusFilter(query.returned),
    refund: parseStatusFilter(query.refund),
    pickup: parseStatusFilter(query.pickup)
  };

  const mongoFilter = {};
  const startDate = new Date(filters.rentStartDate);
  const endDate = new Date(filters.rentEndDate);

  if (!Number.isNaN(startDate.getTime()) && !Number.isNaN(endDate.getTime())) {
    const normalizedStart = clampDate(startDate, start, defaultEndDate);
    normalizedStart.setHours(0, 0, 0, 0);

    const normalizedEnd = clampDate(endDate, start, defaultEndDate);
    normalizedEnd.setHours(23, 59, 59, 999);

    if (normalizedStart <= normalizedEnd) {
      mongoFilter.generalStartTime = {
        $gte: normalizedStart,
        $lte: normalizedEnd
      };
    }

    filters.rentStartDate = formatDateInput(normalizedStart);
    filters.rentEndDate = formatDateInput(normalizedEnd);
  }

  if (filters.todayOrders || filters.tomorrowOrders) {
    const quickRanges = [];
    const todayRange = getDayRange(new Date());

    if (filters.todayOrders) {
      quickRanges.push(todayRange);
    }

    if (filters.tomorrowOrders) {
      const tomorrow = new Date(todayRange.start);
      tomorrow.setDate(tomorrow.getDate() + 1);
      quickRanges.push(getDayRange(tomorrow));
    }

    mongoFilter.$or = quickRanges.map((range) => ({
      generalStartTime: {
        $gte: range.start,
        $lte: range.end
      }
    }));
  }

  if (filters.phone) {
    mongoFilter.phone = { $regex: escapeRegex(filters.phone), $options: "i" };
  }

  if (filters.important) {
    mongoFilter.important = true;
  }

  if (filters.excludeCompletedImportant) {
    mongoFilter.$nor = [
      {
        returned: true,
        returnDeposit: true
      }
    ];
  }

  if (filters.returned !== STATUS_FILTER_ALL) {
    mongoFilter.returned = filters.returned === STATUS_FILTER_TRUE;
  }

  if (filters.refund !== STATUS_FILTER_ALL) {
    mongoFilter.returnDeposit = filters.refund === STATUS_FILTER_TRUE;
  }

  if (filters.pickup !== STATUS_FILTER_ALL) {
    mongoFilter.alreadyPickup = filters.pickup === STATUS_FILTER_TRUE;
  }

  if (filters.bookship !== STATUS_FILTER_ALL) {
    mongoFilter.bookship = filters.bookship === STATUS_FILTER_TRUE;
  }

  return {
    filters,
    mongoFilter,
    monthBounds: {
      min: formatDateInput(start),
      max: formatDateInput(defaultEndDate)
    }
  };
};

const buildPagination = (currentPage, totalItems) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const page = Math.min(Math.max(currentPage, 1), totalPages);

  return {
    page,
    pageSize: PAGE_SIZE,
    totalItems,
    totalPages,
    hasPrev: page > 1,
    hasNext: page < totalPages,
    prevPage: page - 1,
    nextPage: page + 1
  };
};

const resolveOrderAmount = (payload) => {
  const calculatedAmount = calculateOrderAmount(payload);

  if (payload.orderAmount === undefined || payload.orderAmount === null || payload.orderAmount === "") {
    return calculatedAmount;
  }

  return Number(payload.orderAmount);
};

const getIndexData = async (query) => {
  const requestedPage = Number.parseInt(query.page, 10);
  const { filters, mongoFilter, monthBounds } = buildOrderFilters(query);

  const totalItems = await Order.countDocuments(mongoFilter);
  const pagination = buildPagination(Number.isNaN(requestedPage) ? 1 : requestedPage, totalItems);
  const orders = await Order.find(mongoFilter)
    .populate("products.product")
    .populate("accessories.accessory")
    .sort({ createdAt: -1 })
    .skip((pagination.page - 1) * pagination.pageSize)
    .limit(pagination.pageSize);

  return {
    title: "Đơn hàng",
    orders,
    filters,
    pagination,
    monthBounds
  };
};

const getCreateData = async () => ({
  title: "Tạo đơn hàng",
  order: null,
  ...(await getOrderDependencies()),
  formAction: "/orders",
  formMethod: "POST"
});

const getCreateDataFromBody = async (body, error) => ({
  ...(await getCreateData()),
  order: parseOrderPayload(body),
  error
});

const getEditData = async (id) => {
  const [order, dependencies] = await Promise.all([findOrderOrFail(id), getOrderDependencies()]);

  return {
    title: "Chỉnh sửa đơn hàng",
    order,
    ...dependencies,
    formAction: `/orders/${order._id}?_method=PUT`,
    formMethod: "POST"
  };
};

const getEditDataFromBody = async (id, body, error) => ({
  ...(await getEditData(id)),
  order: {
    ...parseOrderPayload(body),
    _id: id
  },
  error
});

const createOrder = async ({ body, user }) => {
  const payload = buildValidatedOrder(body);
  payload.orderAmount = resolveOrderAmount(payload);
  await ensureOrderConflictConfirmed({ body, payload });

  await Order.create(setCreateAuditFields(payload, user));
  if (user.role === USER_ROLES.STAFF) {
    await User.findOneAndUpdate(
      { id: user.id },
      { $inc: { totalOrder: 1 } },
      { runValidators: true }
    );
  }

  return {
    successMessage: "Tạo đơn hàng thành công.",
    redirectTo: "/orders"
  };
};

const updateOrder = async ({ id, body, user }) => {
  await findOrderOrFail(id);
  const payload = buildValidatedOrder(body);
  payload.orderAmount = resolveOrderAmount(payload);
  await ensureOrderConflictConfirmed({ body, payload, excludeOrderId: id });

  await Order.findByIdAndUpdate(id, setUpdateAuditFields(payload, user), {
    runValidators: true
  });

  return {
    successMessage: "Cập nhật đơn hàng thành công.",
    redirectTo: "/orders"
  };
};

const deleteOrder = async (id) => {
  await findOrderOrFail(id);
  await Order.findByIdAndDelete(id);

  return {
    successMessage: "Xóa đơn hàng thành công.",
    redirectTo: "/orders"
  };
};

const getShowData = async (id) => {
  await findOrderOrFail(id);
  const order = await Order.findById(id).populate("products.product").populate("accessories.accessory");

  return {
    title: `Đơn hàng ${order.id}`,
    order
  };
};

const addOrderPayment = async ({ id, body, user }) => {
  const order = await findOrderOrFail(id);
  const payment = validatePayload(paymentSchema, {
    amount: body.amount,
    type: body.type
  });

  order.payments.push(payment);
  Object.assign(order, setUpdateAuditFields({}, user));
  await order.save();

  return {
    successMessage: "Đã thêm thanh toán thành công.",
    redirectTo: `/orders/${order._id}`
  };
};

const updateOrderStatus = async ({ id, body, user }) => {
  const order = await findOrderOrFail(id);
  const statuses = validatePayload(orderStatusSchema, {
    alreadyPickup: body.alreadyPickup,
    returned: body.returned,
    returnDeposit: body.returnDeposit
  });

  order.alreadyPickup = statuses.alreadyPickup;
  order.returned = statuses.returned;
  order.returnDeposit = statuses.returnDeposit;
  Object.assign(order, setUpdateAuditFields({}, user));
  await order.save();

  return {
    successMessage: "Đã cập nhật trạng thái đơn hàng thành công.",
    redirectTo: `/orders/${order._id}`
  };
};

const checkOrderConflicts = async ({ id, body }) => {
  const payload = buildValidatedOrder(body);
  const conflicts = await findConflictingProductLines({
    payload,
    excludeOrderId: id
  });

  return {
    hasConflicts: conflicts.length > 0,
    message: buildConflictMessage(conflicts),
    conflicts
  };
};

module.exports = {
  getIndexData,
  getCreateData,
  getCreateDataFromBody,
  getEditData,
  getEditDataFromBody,
  createOrder,
  updateOrder,
  deleteOrder,
  getShowData,
  addOrderPayment,
  updateOrderStatus,
  checkOrderConflicts
};
