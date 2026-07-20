const Accessory = require("../models/Accessory");
const Order = require("../models/Order");
const { setCreateAuditFields, setUpdateAuditFields } = require("../utils/audit");

const PAGE_SIZE = 10;

const buildPagination = (requestedPage, totalItems) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const page = Math.min(Math.max(Number.parseInt(requestedPage, 10) || 1, 1), totalPages);

  return {
    page,
    totalItems,
    totalPages,
    hasPrev: page > 1,
    hasNext: page < totalPages,
    prevPage: page - 1,
    nextPage: page + 1
  };
};

const findAccessoryOrFail = async (id) => {
  const accessory = await Accessory.findById(id);

  if (!accessory) {
    const error = new Error("Không tìm thấy phụ kiện.");
    error.statusCode = 404;
    throw error;
  }

  return accessory;
};

const getIndexData = async (query = {}) => {
  const totalItems = await Accessory.countDocuments();
  const pagination = buildPagination(query.page, totalItems);

  return {
    title: "Phụ kiện",
    accessories: await Accessory.find()
      .sort({ code: 1 })
      .skip((pagination.page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE),
    pagination
  };
};

const getRentalScheduleData = async (id, query = {}) => {
  const accessory = await findAccessoryOrFail(id);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const orders = await Order.find({
    returned: false,
    accessories: {
      $elemMatch: {
        accessory: accessory._id,
        endTime: { $gte: today }
      }
    }
  })
    .select("customerName phone returned accessories")
    .sort({ generalStartTime: 1 });
  const rentals = orders
    .flatMap((order) =>
      order.accessories
        .filter((item) => `${item.accessory}` === `${accessory._id}` && new Date(item.endTime) >= today)
        .map((item) => ({
          orderId: order._id,
          customerName: order.customerName,
          phone: order.phone,
          amount: Number(item.amount ?? 1),
          returned: order.returned,
          startTime: item.startTime,
          endTime: item.endTime
        }))
    )
    .sort((left, right) => new Date(left.startTime) - new Date(right.startTime));

  const pagination = buildPagination(query.page, rentals.length);

  return {
    title: `Lịch thuê phụ kiện ${accessory.code}`,
    accessory,
    rentals: rentals.slice((pagination.page - 1) * PAGE_SIZE, pagination.page * PAGE_SIZE),
    pagination
  };
};

const getCreateData = () => ({
  title: "Tạo phụ kiện",
  accessory: null,
  formAction: "/accessories",
  formMethod: "POST"
});

const createAccessory = async ({ validatedBody, user }) => {
  await Accessory.create(setCreateAuditFields(validatedBody, user));

  return {
    successMessage: "Tạo phụ kiện thành công.",
    redirectTo: "/accessories"
  };
};

const getEditData = async (id) => {
  const accessory = await findAccessoryOrFail(id);

  return {
    title: "Chỉnh sửa phụ kiện",
    accessory,
    formAction: `/accessories/${accessory._id}?_method=PUT`,
    formMethod: "POST"
  };
};

const updateAccessory = async ({ id, validatedBody, user }) => {
  await findAccessoryOrFail(id);
  await Accessory.findByIdAndUpdate(id, setUpdateAuditFields(validatedBody, user), {
    runValidators: true
  });

  return {
    successMessage: "Cập nhật phụ kiện thành công.",
    redirectTo: "/accessories"
  };
};

const deleteAccessory = async (id) => {
  await findAccessoryOrFail(id);
  await Accessory.findByIdAndDelete(id);

  return {
    successMessage: "Xóa phụ kiện thành công.",
    redirectTo: "/accessories"
  };
};

module.exports = {
  getIndexData,
  getRentalScheduleData,
  getCreateData,
  createAccessory,
  getEditData,
  updateAccessory,
  deleteAccessory
};
