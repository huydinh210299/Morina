const Order = require("../models/Order");
const Product = require("../models/Product");
const Accessory = require("../models/Accessory");
const User = require("../models/User");
const { parseOrderPayload } = require("../utils/requestParsers");
const {
  orderSchema,
  paymentSchema,
  orderProductAdditionSchema,
  orderAccessoryAdditionSchema,
  orderDepositUpdateSchema,
  orderStatusSchema,
  orderNoteSchema
} = require("../utils/validators");
const { setCreateAuditFields, setUpdateAuditFields } = require("../utils/audit");
const { USER_ROLES } = require("../utils/constants");
const validationOptions = require("../utils/validationOptions");

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

  const { error, value } = orderSchema.validate(payload, validationOptions);

  if (error) {
    const validationError = new Error(error.details.map((detail) => detail.message).join(", "));
    validationError.statusCode = 400;
    throw validationError;
  }

  return value;
};

const validatePayload = (schema, payload) => {
  const { error, value } = schema.validate(payload, validationOptions);

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
  return productTotal + accessoryTotal;
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
    .select("customerName products");

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
          orderCode: order._id.toString(),
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
    returnStartDate: typeof query.returnStartDate === "string" ? query.returnStartDate : "",
    returnEndDate: typeof query.returnEndDate === "string" ? query.returnEndDate : "",
    todayOrders: parseCheckbox(query.todayOrders),
    tomorrowOrders: parseCheckbox(query.tomorrowOrders),
    returnDueToday: parseCheckbox(query.returnDueToday),
    overdueUnreturned: parseCheckbox(query.overdueUnreturned),
    returnedNotRefunded: parseCheckbox(query.returnedNotRefunded),
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
    const normalizedStart = new Date(startDate);
    normalizedStart.setHours(0, 0, 0, 0);

    const normalizedEnd = new Date(endDate);
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

  const returnStartDate = filters.returnStartDate ? new Date(filters.returnStartDate) : null;
  const returnEndDate = filters.returnEndDate ? new Date(filters.returnEndDate) : null;
  const returnDateFilter = {};

  if (returnStartDate && !Number.isNaN(returnStartDate.getTime())) {
    returnStartDate.setHours(0, 0, 0, 0);
    returnDateFilter.$gte = returnStartDate;
    filters.returnStartDate = formatDateInput(returnStartDate);
  } else {
    filters.returnStartDate = "";
  }

  if (returnEndDate && !Number.isNaN(returnEndDate.getTime())) {
    returnEndDate.setHours(23, 59, 59, 999);
    returnDateFilter.$lte = returnEndDate;
    filters.returnEndDate = formatDateInput(returnEndDate);
  } else {
    filters.returnEndDate = "";
  }

  if (Object.keys(returnDateFilter).length) {
    mongoFilter.generalEndTime = returnDateFilter;
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

  if (filters.returnDueToday || filters.overdueUnreturned) {
    const todayRange = getDayRange(new Date());
    delete mongoFilter.generalStartTime;

    if (filters.returnDueToday && filters.overdueUnreturned) {
      mongoFilter.generalEndTime = { $lte: todayRange.end };
    } else if (filters.returnDueToday) {
      mongoFilter.generalEndTime = {
        $gte: todayRange.start,
        $lte: todayRange.end
      };
    } else {
      mongoFilter.generalEndTime = { $lt: new Date() };
    }

    mongoFilter.returned = false;
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

  if (!filters.returnDueToday && !filters.overdueUnreturned && filters.returned !== STATUS_FILTER_ALL) {
    mongoFilter.returned = filters.returned === STATUS_FILTER_TRUE;
  }

  if (filters.refund !== STATUS_FILTER_ALL) {
    mongoFilter.returnDeposit = filters.refund === STATUS_FILTER_TRUE;
  }

  if (filters.returnedNotRefunded) {
    mongoFilter.returned = true;
    mongoFilter.returnDeposit = false;
  }

  if (filters.pickup !== STATUS_FILTER_ALL) {
    mongoFilter.alreadyPickup = filters.pickup === STATUS_FILTER_TRUE;
  }

  if (filters.bookship !== STATUS_FILTER_ALL) {
    mongoFilter.bookship = filters.bookship === STATUS_FILTER_TRUE;
  }

  return {
    filters,
    mongoFilter
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

const calculateTotalOrderAmount = (order) => Number(order.orderAmount || 0) + Number(order.surcharge || 0);

const calculateRemainingAmount = (order) => {
  const totalDue = calculateTotalOrderAmount(order) + Number(order.deposit || 0);
  const totalPaid = (order.payments || []).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  return Math.max(0, totalDue - totalPaid);
};

const getIndexData = async (query) => {
  const requestedPage = Number.parseInt(query.page, 10);
  const { filters, mongoFilter } = buildOrderFilters(query);

  const totalItems = await Order.countDocuments(mongoFilter);
  const pagination = buildPagination(Number.isNaN(requestedPage) ? 1 : requestedPage, totalItems);
  const orderDocuments = await Order.find(mongoFilter)
    .populate("products.product")
    .populate("accessories.accessory")
    .sort({ createdAt: -1 })
    .skip((pagination.page - 1) * pagination.pageSize)
    .limit(pagination.pageSize);

  const orders = orderDocuments.map((order) => ({
    ...order.toObject(),
    totalOrderAmount: calculateTotalOrderAmount(order),
    remainingAmount: calculateRemainingAmount(order)
  }));

  return {
    title: "Đơn hàng",
    orders,
    filters,
    pagination
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

  const productIds = [...new Set(payload.products.map((item) => `${item.product}`))];
  if (productIds.length) {
    await Product.updateMany(
      { _id: { $in: productIds } },
      { $inc: { orderCount: 1 } },
      { runValidators: true }
    );
  }

  if (user.role === USER_ROLES.STAFF) {
    await User.findByIdAndUpdate(
      user._id,
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
  const [order, availableProducts, availableAccessories] = await Promise.all([
    Order.findById(id).populate("products.product").populate("accessories.accessory"),
    Product.find({ isDeleted: false }).sort({ code: 1 }).select("code size note fullDayPrice sixHPrice"),
    Accessory.find().sort({ code: 1 }).select("code name price amount")
  ]);

  if (!order) {
    const error = new Error("Không tìm thấy đơn hàng.");
    error.statusCode = 404;
    throw error;
  }

  return {
    title: `Đơn hàng ${order._id}`,
    order,
    availableProducts,
    availableAccessories
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

const updateOrderPayment = async ({ id, paymentIndex, body, user }) => {
  const order = await findOrderOrFail(id);
  const index = /^\d+$/.test(paymentIndex) ? Number(paymentIndex) : Number.NaN;

  if (!Number.isInteger(index) || index < 0 || index >= order.payments.length) {
    const error = new Error("Không tìm thấy khoản thanh toán.");
    error.statusCode = 404;
    throw error;
  }

  const payment = validatePayload(paymentSchema, {
    amount: body.amount,
    type: body.type
  });

  order.payments[index] = payment;
  Object.assign(order, setUpdateAuditFields({}, user));
  await order.save();

  return {
    successMessage: "Đã cập nhật thanh toán thành công.",
    redirectTo: `/orders/${order._id}`
  };
};

const addOrderProduct = async ({ id, body, user }) => {
  const order = await findOrderOrFail(id);
  const productCodes = Array.isArray(body.productCodes) ? body.productCodes : [body.productCodes];
  const productPrices = Array.isArray(body.productPrices) ? body.productPrices : [body.productPrices];
  const payload = validatePayload(orderProductAdditionSchema, {
    products: productCodes.map((productCode, index) => ({
      productCode,
      price: productPrices[index]
    })),
    orderAmount: body.orderAmount
  });

  if (payload.orderAmount <= Number(order.orderAmount)) {
    const error = new Error("Tổng tiền đơn mới phải lớn hơn tổng tiền đơn hiện tại.");
    error.statusCode = 400;
    throw error;
  }

  const products = await Product.find({
    code: { $in: payload.products.map((item) => item.productCode) },
    isDeleted: false
  });
  const productByCode = new Map(products.map((product) => [product.code, product]));
  const missingProduct = payload.products.find((item) => !productByCode.has(item.productCode));

  if (missingProduct) {
    const error = new Error(`Không tìm thấy sản phẩm đang hoạt động: ${missingProduct.productCode}.`);
    error.statusCode = 404;
    throw error;
  }

  const productLines = payload.products.map((item) => ({
    product: productByCode.get(item.productCode)._id,
    price: item.price,
    useGeneralTimes: true,
    startTime: order.generalStartTime,
    endTime: order.generalEndTime
  }));
  const conflicts = await findConflictingProductLines({
    payload: { products: productLines },
    excludeOrderId: id
  });

  if (conflicts.length) {
    const error = new Error(buildConflictMessage(conflicts));
    error.statusCode = 409;
    throw error;
  }

  order.products.push(...productLines);
  order.orderAmount = payload.orderAmount;
  Object.assign(order, setUpdateAuditFields({}, user));
  await order.save();
  await Promise.all(
    productLines.map((productLine) =>
      Product.findByIdAndUpdate(productLine.product, { $inc: { orderCount: 1 } }, { runValidators: true })
    )
  );

  return {
    successMessage: "Đã thêm sản phẩm vào đơn hàng và cập nhật tổng tiền.",
    redirectTo: `/orders/${order._id}`
  };
};

const addOrderAccessory = async ({ id, body, user }) => {
  const order = await findOrderOrFail(id);
  const accessoryCodes = Array.isArray(body.accessoryCodes) ? body.accessoryCodes : [body.accessoryCodes];
  const accessoryPrices = Array.isArray(body.accessoryPrices) ? body.accessoryPrices : [body.accessoryPrices];
  const accessoryAmounts = Array.isArray(body.accessoryAmounts) ? body.accessoryAmounts : [body.accessoryAmounts];
  const payload = validatePayload(orderAccessoryAdditionSchema, {
    accessories: accessoryCodes.map((accessoryCode, index) => ({
      accessoryCode,
      price: accessoryPrices[index],
      amount: accessoryAmounts[index]
    })),
    orderAmount: body.orderAmount
  });

  if (payload.orderAmount <= Number(order.orderAmount)) {
    const error = new Error("Tổng tiền đơn mới phải lớn hơn tổng tiền đơn hiện tại.");
    error.statusCode = 400;
    throw error;
  }

  const accessories = await Accessory.find({
    code: { $in: payload.accessories.map((item) => item.accessoryCode) }
  });
  const accessoryByCode = new Map(accessories.map((accessory) => [accessory.code, accessory]));
  const missingAccessory = payload.accessories.find((item) => !accessoryByCode.has(item.accessoryCode));

  if (missingAccessory) {
    const error = new Error(`Không tìm thấy phụ kiện: ${missingAccessory.accessoryCode}.`);
    error.statusCode = 404;
    throw error;
  }

  order.accessories.push(
    ...payload.accessories.map((item) => ({
      accessory: accessoryByCode.get(item.accessoryCode)._id,
      price: item.price,
      amount: item.amount,
      useGeneralTimes: true,
      startTime: order.generalStartTime,
      endTime: order.generalEndTime
    }))
  );
  order.orderAmount = payload.orderAmount;
  Object.assign(order, setUpdateAuditFields({}, user));
  await order.save();

  return {
    successMessage: "Đã thêm phụ kiện vào đơn hàng và cập nhật tổng tiền.",
    redirectTo: `/orders/${order._id}`
  };
};

const updateOrderDeposit = async ({ id, body, user }) => {
  const order = await findOrderOrFail(id);
  const payload = validatePayload(orderDepositUpdateSchema, body);

  if (payload.deposit <= Number(order.deposit)) {
    const error = new Error("Tiền cọc mới phải lớn hơn tiền cọc hiện tại.");
    error.statusCode = 400;
    throw error;
  }

  order.deposit = payload.deposit;
  Object.assign(order, setUpdateAuditFields({}, user));
  await order.save();

  return {
    successMessage: "Đã cập nhật tiền cọc thành công.",
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

const updateOrderNote = async ({ id, body, user }) => {
  const order = await findOrderOrFail(id);
  const notePayload = validatePayload(orderNoteSchema, {
    note: body.note
  });

  order.note = notePayload.note;
  Object.assign(order, setUpdateAuditFields({}, user));
  await order.save();

  return {
    successMessage: "Đã cập nhật ghi chú đơn hàng thành công.",
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
  updateOrderPayment,
  addOrderProduct,
  addOrderAccessory,
  updateOrderDeposit,
  updateOrderStatus,
  updateOrderNote,
  checkOrderConflicts
};
