const Accessory = require("../models/Accessory");
const { setCreateAuditFields, setUpdateAuditFields } = require("../utils/audit");

const findAccessoryOrFail = async (id) => {
  const accessory = await Accessory.findById(id);

  if (!accessory) {
    const error = new Error("Không tìm thấy phụ kiện.");
    error.statusCode = 404;
    throw error;
  }

  return accessory;
};

const getIndexData = async () => ({
  title: "Phụ kiện",
  accessories: await Accessory.find().sort({ code: 1 })
});

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
  getCreateData,
  createAccessory,
  getEditData,
  updateAccessory,
  deleteAccessory
};
