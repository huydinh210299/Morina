const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Shift = require("../models/Shift");
const Setting = require("../models/Setting");
const { USER_ROLES } = require("../utils/constants");
const { setCreateAuditFields, setUpdateAuditFields } = require("../utils/audit");

const HOUR_SALARY_KEY = "hourSalary";
const CASH_ON_HAND_KEY = "cashOnHand";
const COMMISSION_KEY = "commission";

const findUserByIdOrFail = async (id, projection = "-password") => {
  const user = await User.findById(id).select(projection);

  if (!user) {
    const error = new Error("Không tìm thấy người dùng.");
    error.statusCode = 404;
    throw error;
  }

  return user;
};

const findShiftByIdOrFail = async (id) => {
  const shift = await Shift.findById(id);

  if (!shift) {
    const error = new Error("Không tìm thấy ca làm.");
    error.statusCode = 404;
    throw error;
  }

  return shift;
};

const ensureUsernameAvailable = async (username, excludeId = null) => {
  const existingUser = await User.findOne({
    username,
    ...(excludeId ? { _id: { $ne: excludeId } } : {})
  });

  if (existingUser) {
    const error = new Error("Tên đăng nhập đã tồn tại.");
    error.statusCode = 400;
    throw error;
  }
};

const parseMonthInput = (monthInput) => {
  const fallback = new Date();
  const match = typeof monthInput === "string" ? monthInput.match(/^(\d{4})-(\d{2})$/) : null;

  if (!match) {
    return {
      selectedMonth: `${fallback.getFullYear()}-${String(fallback.getMonth() + 1).padStart(2, "0")}`,
      start: new Date(fallback.getFullYear(), fallback.getMonth(), 1),
      end: new Date(fallback.getFullYear(), fallback.getMonth() + 1, 1)
    };
  }

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;

  return {
    selectedMonth: `${year}-${String(month + 1).padStart(2, "0")}`,
    start: new Date(year, month, 1),
    end: new Date(year, month + 1, 1)
  };
};

const isDateInRange = (value, start, end) => {
  const date = new Date(value);
  return date >= start && date < end;
};

const normalizeDate = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const sortByDateDesc = (left, right) => new Date(right.date) - new Date(left.date);

const buildAdjustmentRedirectMonth = (month, fallbackDate = new Date()) => {
  if (typeof month === "string" && /^\d{4}-\d{2}$/.test(month)) {
    return month;
  }

  return `${fallbackDate.getFullYear()}-${String(fallbackDate.getMonth() + 1).padStart(2, "0")}`;
};

const getAdjustmentItemsForRange = (items = [], range, { approvedOnly = false } = {}) =>
  items
    .filter((item) => isDateInRange(item.date, range.start, range.end))
    .filter((item) => (approvedOnly ? item.approved : true))
    .map((item) => ({
      id: item._id,
      date: item.date,
      amount: Number(item.amount || 0),
      description: item.description || "",
      approved: item.approved
    }))
    .sort(sortByDateDesc);

const getHourSalarySetting = async () => {
  let setting = await Setting.findOne({ key: HOUR_SALARY_KEY });

  if (!setting) {
    setting = await Setting.create({
      key: HOUR_SALARY_KEY,
      value: "20000"
    });
  }

  return setting;
};

const getHourSalaryValue = async () => {
  const setting = await getHourSalarySetting();
  return Number(setting.value || 0);
};

const getCashOnHandSetting = async () => {
  let setting = await Setting.findOne({ key: CASH_ON_HAND_KEY });

  if (!setting) {
    setting = await Setting.create({
      key: CASH_ON_HAND_KEY,
      value: String(0)
    });
  }

  return setting;
};

const getCommissionSetting = async () => {
  let setting = await Setting.findOne({ key: COMMISSION_KEY });

  if (!setting) {
    setting = await Setting.create({
      key: COMMISSION_KEY,
      value: "3000"
    });
  }

  return setting;
};

const getCommissionValue = async () => {
  const setting = await getCommissionSetting();
  return Number(setting.value || 0);
};

const getEffectiveShiftSalary = (shift, defaultHourSalary) => {
  if (!shift) {
    return Number(defaultHourSalary || 0);
  }

  return shift.salary === null || shift.salary === undefined || shift.salary === ""
    ? Number(defaultHourSalary || 0)
    : Number(shift.salary || 0);
};

const buildPayrollEntries = (timekeeping = [], range, defaultHourSalary = 0) =>
  timekeeping
    .filter((entry) => entry.approved && entry.shiftId && isDateInRange(entry.date, range.start, range.end))
    .map((entry) => ({
      id: entry._id,
      date: entry.date,
      approved: entry.approved,
      shiftName: entry.shiftId.name,
      shiftDescription: entry.shiftId.description,
      hour: Number(entry.shiftId.hour || 0),
      shiftRate: getEffectiveShiftSalary(entry.shiftId, defaultHourSalary),
      totalSalary: Number(entry.shiftId.hour || 0) * getEffectiveShiftSalary(entry.shiftId, defaultHourSalary)
    }))
    .sort(sortByDateDesc);

const buildShiftPayrollSummary = (approvedEntries = []) =>
  Object.values(
    approvedEntries.reduce((summary, entry) => {
      const key = `${entry.shiftName}::${entry.shiftRate}`;

      if (!summary[key]) {
        summary[key] = {
          shiftName: entry.shiftName,
          shiftDescription: entry.shiftDescription,
          shiftRate: entry.shiftRate,
          totalHour: 0,
          totalSalary: 0,
          shiftCount: 0
        };
      }

      summary[key].totalHour += entry.hour;
      summary[key].totalSalary += entry.totalSalary;
      summary[key].shiftCount += 1;

      return summary;
    }, {})
  ).sort((left, right) => right.totalHour - left.totalHour || left.shiftName.localeCompare(right.shiftName));

const buildSalaryHistory = (salary = []) =>
  [...salary].sort((left, right) => {
    if (right.year !== left.year) {
      return right.year - left.year;
    }

    return right.month - left.month;
  });

const getCreatedDataCount = (userItem) => Number(userItem.totalOrder || 0);

const ensureStaffUser = (userItem) => {
  if (userItem.role !== USER_ROLES.STAFF) {
    const error = new Error("Chỉ có thể thao tác với nhân viên.");
    error.statusCode = 400;
    throw error;
  }
};

const getIndexData = async () => {
  const [users, hourSalarySetting, pendingUsers, commissionSetting, cashOnHandSetting] = await Promise.all([
    User.find().select("-password").sort({ createdAt: -1 }),
    getHourSalarySetting(),
    User.find({ "timekeeping.approved": false }).select("timekeeping"),
    getCommissionSetting(),
    getCashOnHandSetting()
  ]);

  const pendingCount = pendingUsers.reduce(
    (sum, userItem) => sum + userItem.timekeeping.filter((entry) => !entry.approved).length,
    0
  );

  return {
    title: "Quản lý người dùng",
    users,
    hourSalary: Number(hourSalarySetting.value || 0),
    commission: Number(commissionSetting.value || 0),
    pendingCount,
    cashOnHand: Number(cashOnHandSetting.value || 0)
  };
};

const getCreateData = () => ({
  title: "Tạo người dùng",
  userItem: null,
  roles: Object.values(USER_ROLES),
  formAction: "/users",
  formMethod: "POST"
});

const getShowData = async (id) => {
  const userItem = await findUserByIdOrFail(id);

  return {
    title: "Chi tiết người dùng",
    userItem,
    approvedCommissionCount: (userItem.commissions || []).filter((item) => item.approved).length,
    pendingCommissionCount: (userItem.commissions || []).filter((item) => !item.approved).length,
    faultCount: (userItem.faults || []).length
  };
};

const createUser = async ({ validatedBody, user }) => {
  await ensureUsernameAvailable(validatedBody.username);
  const hashedPassword = await bcrypt.hash(validatedBody.password, 10);

  await User.create(
    setCreateAuditFields(
      {
        username: validatedBody.username,
        password: hashedPassword,
        role: validatedBody.role,
        totalOrder: validatedBody.totalOrder
      },
      user
    )
  );

  return {
    successMessage: "Tạo người dùng thành công.",
    redirectTo: "/users"
  };
};

const getEditData = async (id) => ({
  title: "Cập nhật người dùng",
  userItem: await findUserByIdOrFail(id),
  roles: Object.values(USER_ROLES),
  formAction: `/users/${id}?_method=PUT`,
  formMethod: "POST"
});

const updateUser = async ({ id, validatedBody, user }) => {
  const existingUser = await User.findById(id);

  if (!existingUser) {
    const error = new Error("Không tìm thấy người dùng.");
    error.statusCode = 404;
    throw error;
  }

  await ensureUsernameAvailable(validatedBody.username, id);

  const payload = {
    username: validatedBody.username,
    role: validatedBody.role,
    totalOrder: validatedBody.totalOrder
  };

  if (validatedBody.password) {
    payload.password = await bcrypt.hash(validatedBody.password, 10);
  }

  await User.findByIdAndUpdate(id, setUpdateAuditFields(payload, user), {
    runValidators: true
  });

  return {
    successMessage: "Cập nhật người dùng thành công.",
    redirectTo: "/users"
  };
};

const getShiftIndexData = async ({ editShiftId } = {}) => {
  const [shifts, hourSalarySetting] = await Promise.all([Shift.find().sort({ createdAt: -1 }), getHourSalarySetting()]);
  const editingShift = editShiftId
    ? shifts.find((shift) => String(shift._id) === String(editShiftId))
    : null;

  return {
    title: "Quản lý ca làm",
    shifts,
    hourSalary: Number(hourSalarySetting.value || 0),
    editingShift
  };
};

const createShift = async ({ validatedBody, user }) => {
  await Shift.create(
    setCreateAuditFields(
      {
        name: validatedBody.name,
        hour: validatedBody.hour,
        salary:
          validatedBody.salary === null || validatedBody.salary === undefined || validatedBody.salary === ""
            ? null
            : validatedBody.salary,
        description: validatedBody.description
      },
      user
    )
  );

  return {
    successMessage: "Tạo ca làm thành công.",
    redirectTo: "/users/shifts"
  };
};

const updateShift = async ({ id, validatedBody, user }) => {
  const existingShift = await findShiftByIdOrFail(id);

  existingShift.name = validatedBody.name;
  existingShift.hour = validatedBody.hour;
  existingShift.salary =
    validatedBody.salary === null || validatedBody.salary === undefined || validatedBody.salary === ""
      ? null
      : validatedBody.salary;
  existingShift.description = validatedBody.description;
  setUpdateAuditFields(existingShift, user);
  await existingShift.save();

  return {
    successMessage: "Cập nhật ca làm thành công.",
    redirectTo: "/users/shifts"
  };
};

const updateHourSalarySetting = async ({ validatedBody }) => {
  const setting = await getHourSalarySetting();
  setting.value = String(validatedBody.value);
  await setting.save();

  return {
    successMessage: "Cập nhật lương theo giờ thành công.",
    redirectTo: "/users/shifts"
  };
};

const updateCashOnHandSetting = async ({ validatedBody }) => {
  const setting = await getCashOnHandSetting();
  setting.value = String(validatedBody.value);
  await setting.save();

  return {
    successMessage: "Cập nhật số dư tiền mặt thành công.",
    redirectTo: "/users"
  };
};

const updateCommissionSetting = async ({ validatedBody }) => {
  const setting = await getCommissionSetting();
  setting.value = String(validatedBody.value);
  await setting.save();

  return {
    successMessage: "Cập nhật hoa hồng theo đơn thành công.",
    redirectTo: "/users"
  };
};

const getOwnTimekeepingData = async ({ userId, month }) => {
  const range = parseMonthInput(month);
  const [userItem, shifts] = await Promise.all([
    User.findById(userId).select("-password").populate("timekeeping.shiftId"),
    Shift.find().sort({ name: 1 })
  ]);

  if (!userItem) {
    const error = new Error("Không tìm thấy người dùng.");
    error.statusCode = 404;
    throw error;
  }

  const entries = userItem.timekeeping
    .filter((entry) => entry.shiftId && isDateInRange(entry.date, range.start, range.end))
    .map((entry) => ({
      id: entry._id,
      date: entry.date,
      approved: entry.approved,
      shiftName: entry.shiftId.name,
      shiftDescription: entry.shiftId.description,
      hour: Number(entry.shiftId.hour || 0)
    }))
    .sort(sortByDateDesc);

  const commissionEntries = getAdjustmentItemsForRange(userItem.commissions, range);

  return {
    title: "Cham cong cua toi",
    shifts,
    entries,
    commissionEntries,
    selectedMonth: range.selectedMonth
  };
};

const createTimekeeping = async ({ userId, validatedBody, user }) => {
  await findShiftByIdOrFail(validatedBody.shiftId);
  const userItem = await User.findById(userId);

  if (!userItem) {
    const error = new Error("Không tìm thấy người dùng.");
    error.statusCode = 404;
    throw error;
  }

  const normalizedDate = normalizeDate(validatedBody.date);
  const hasDuplicate = userItem.timekeeping.some(
    (entry) =>
      entry.shiftId.toString() === validatedBody.shiftId &&
      normalizeDate(entry.date).getTime() === normalizedDate.getTime()
  );

  if (hasDuplicate) {
    const error = new Error("Bạn đã chấm công ca làm này trong ngày này.");
    error.statusCode = 400;
    throw error;
  }

  userItem.timekeeping.push({
    shiftId: validatedBody.shiftId,
    date: normalizedDate,
    approved: false
  });
  userItem.updatedBy = user._id.toString();
  await userItem.save();

  return {
    successMessage: "Tạo chấm công thành công, vui lòng chờ duyệt.",
    redirectTo: "/users/timekeeping"
  };
};

const createCommissionRequest = async ({ userId, validatedBody, user }) => {
  const userItem = await User.findById(userId);

  if (!userItem) {
    const error = new Error("Không tìm thấy người dùng.");
    error.statusCode = 404;
    throw error;
  }

  ensureStaffUser(userItem);
  userItem.commissions = userItem.commissions || [];

  userItem.commissions.push({
    date: normalizeDate(validatedBody.date),
    amount: validatedBody.amount,
    description: validatedBody.description,
    approved: false
  });
  userItem.updatedBy = user._id.toString();
  await userItem.save();

  return {
    successMessage: "Đã gửi yêu cầu hoa hồng, vui lòng chờ quản trị viên duyệt.",
    redirectTo: `/users/timekeeping?month=${buildAdjustmentRedirectMonth(validatedBody.month, new Date(validatedBody.date))}`
  };
};

const getPendingTimekeepingData = async ({ month }) => {
  const range = parseMonthInput(month);
  const users = await User.find({ "timekeeping.approved": false })
    .select("-password")
    .populate("timekeeping.shiftId")
    .sort({ updatedAt: -1 });

  const pendingEntries = users
    .flatMap((userItem) =>
      userItem.timekeeping
        .filter((entry) => !entry.approved && entry.shiftId && isDateInRange(entry.date, range.start, range.end))
        .map((entry) => ({
          userId: userItem._id,
          username: userItem.username,
          role: userItem.role,
          timekeepingId: entry._id,
          date: entry.date,
          shiftName: entry.shiftId.name,
          shiftDescription: entry.shiftId.description,
          hour: Number(entry.shiftId.hour || 0)
        }))
    )
    .sort(sortByDateDesc);

  return {
    title: "Duyệt chấm công",
    pendingEntries,
    selectedMonth: range.selectedMonth
  };
};

const approveTimekeeping = async ({ userId, timekeepingId, user }) => {
  const userItem = await User.findById(userId);

  if (!userItem) {
    const error = new Error("Không tìm thấy người dùng.");
    error.statusCode = 404;
    throw error;
  }

  const timekeepingEntry = userItem.timekeeping.id(timekeepingId);

  if (!timekeepingEntry) {
    const error = new Error("Không tìm thấy bản ghi chấm công.");
    error.statusCode = 404;
    throw error;
  }

  timekeepingEntry.approved = true;
  userItem.updatedBy = user._id.toString();
  await userItem.save();

  return {
    successMessage: "Duyệt chấm công thành công.",
    redirectTo: "/users/timekeeping/pending"
  };
};

const approveCommission = async ({ userId, commissionId, month, user }) => {
  const userItem = await User.findById(userId);

  if (!userItem) {
    const error = new Error("Không tìm thấy người dùng.");
    error.statusCode = 404;
    throw error;
  }

  ensureStaffUser(userItem);
  userItem.commissions = userItem.commissions || [];

  const commissionEntry = userItem.commissions.id(commissionId);

  if (!commissionEntry) {
    const error = new Error("Không tìm thấy hoa hồng.");
    error.statusCode = 404;
    throw error;
  }

  commissionEntry.approved = true;
  userItem.updatedBy = user._id.toString();
  await userItem.save();

  return {
    successMessage: "Đã duyệt hoa hồng thành công.",
    redirectTo: `/users/${userId}/payroll?month=${buildAdjustmentRedirectMonth(month, new Date(commissionEntry.date))}`
  };
};

const getPayrollData = async ({ userId, month }) => {
  const range = parseMonthInput(month);
  const [userItem, hourSalary, commission] = await Promise.all([
    User.findById(userId).select("-password").populate("timekeeping.shiftId"),
    getHourSalaryValue(),
    getCommissionValue()
  ]);

  if (!userItem) {
    const error = new Error("Không tìm thấy người dùng.");
    error.statusCode = 404;
    throw error;
  }

  const approvedEntries = buildPayrollEntries(userItem.timekeeping, range, hourSalary);
  const approvedCommissionEntries = getAdjustmentItemsForRange(userItem.commissions || [], range, { approvedOnly: true });
  const pendingCommissionEntries = getAdjustmentItemsForRange(userItem.commissions || [], range).filter((item) => !item.approved);
  const faultEntries = getAdjustmentItemsForRange(userItem.faults || [], range);
  const totalHour = approvedEntries.reduce((sum, entry) => sum + entry.hour, 0);
  const orderCount = getCreatedDataCount(userItem);
  const shiftSalary = approvedEntries.reduce((sum, entry) => sum + entry.totalSalary, 0);
  const orderCommissionSalary = orderCount * commission;
  const extraCommissionSalary = approvedCommissionEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const faultSalary = faultEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const salary = shiftSalary + orderCommissionSalary + extraCommissionSalary - faultSalary;
  const pendingCount = userItem.timekeeping.filter(
    (entry) => !entry.approved && entry.shiftId && isDateInRange(entry.date, range.start, range.end)
  ).length;

  return {
    title: "Lương nhân viên",
    userItem,
    approvedEntries,
    shiftPayrollSummary: buildShiftPayrollSummary(approvedEntries),
    selectedMonth: range.selectedMonth,
    totalHour,
    hourSalary,
    commission,
    orderCount,
    shiftSalary,
    orderCommissionSalary,
    extraCommissionSalary,
    faultSalary,
    salary,
    pendingCount,
    approvedCommissionEntries,
    pendingCommissionEntries,
    faultEntries,
    salaryHistory: buildSalaryHistory(userItem.salary)
  };
};

const paySalary = async ({ userId, month, user }) => {
  const range = parseMonthInput(month);
  const userItem = await User.findById(userId).populate("timekeeping.shiftId");

  if (!userItem) {
    const error = new Error("Không tìm thấy người dùng.");
    error.statusCode = 404;
    throw error;
  }

  ensureStaffUser(userItem);

  const pendingCount = userItem.timekeeping.filter(
    (entry) => !entry.approved && entry.shiftId && isDateInRange(entry.date, range.start, range.end)
  ).length;

  if (pendingCount > 0) {
    const error = new Error("Vẫn còn chấm công chờ duyệt trong tháng này.");
    error.statusCode = 400;
    throw error;
  }

  const [hourSalary, commission] = await Promise.all([getHourSalaryValue(), getCommissionValue()]);
  const approvedEntries = buildPayrollEntries(userItem.timekeeping, range, hourSalary);
  const approvedCommissionEntries = getAdjustmentItemsForRange(userItem.commissions || [], range, { approvedOnly: true });
  const faultEntries = getAdjustmentItemsForRange(userItem.faults || [], range);
  const orderCount = getCreatedDataCount(userItem);
  const totalShiftSalary = approvedEntries.reduce((sum, entry) => sum + entry.totalSalary, 0);
  const totalExtraCommission = approvedCommissionEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const totalFault = faultEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const totalSalary = totalShiftSalary + orderCount * commission + totalExtraCommission - totalFault;

  const payrollMonth = range.start.getMonth() + 1;
  const payrollYear = range.start.getFullYear();
  const existingSalaryForMonth = userItem.salary.find(
    (entry) => entry.month === payrollMonth && entry.year === payrollYear
  );

  if (totalSalary <= 0) {
    const error = new Error("Không có dữ liệu lương mới để thanh toán.");
    error.statusCode = 400;
    throw error;
  }

  const remainingTimekeeping = userItem.timekeeping.filter(
    (entry) => !isDateInRange(entry.date, range.start, range.end)
  );
  const remainingFaults = (userItem.faults || []).filter((entry) => !isDateInRange(entry.date, range.start, range.end));
  const remainingCommissions = (userItem.commissions || []).filter(
    (entry) => !isDateInRange(entry.date, range.start, range.end)
  );

  const updatePayload = {
    $set: {
      totalOrder: 0,
      timekeeping: remainingTimekeeping,
      faults: remainingFaults,
      commissions: remainingCommissions,
      updatedBy: user._id.toString()
    }
  };

  let updateResult;

  if (existingSalaryForMonth) {
    updateResult = await User.updateOne(
      {
        _id: userId,
        "salary.month": payrollMonth,
        "salary.year": payrollYear
      },
      {
        ...updatePayload,
        $inc: {
          "salary.$.salary": totalSalary
        }
      },
      {
        runValidators: true
      }
    );
  } else {
    updateResult = await User.updateOne(
      {
        _id: userId,
        salary: {
          $not: {
            $elemMatch: {
              month: payrollMonth,
              year: payrollYear
            }
          }
        }
      },
      {
        ...updatePayload,
        $push: {
          salary: {
            month: payrollMonth,
            year: payrollYear,
            salary: totalSalary
          }
        }
      },
      {
        runValidators: true
      }
    );
  }

  if (updateResult.modifiedCount === 0) {
    const error = new Error("Tháng nay đã được thanh toán lương.");
    error.statusCode = 400;
    throw error;
  }

  return {
    successMessage: "Đã thanh toán lương và chốt công trong tháng thành công.",
    redirectTo: `/users/${userId}/payroll?month=${range.selectedMonth}`
  };
};

const createFault = async ({ userId, validatedBody, user }) => {
  const userItem = await User.findById(userId);

  if (!userItem) {
    const error = new Error("Không tìm thấy người dùng.");
    error.statusCode = 404;
    throw error;
  }

  ensureStaffUser(userItem);
  userItem.faults = userItem.faults || [];

  userItem.faults.push({
    date: normalizeDate(validatedBody.date),
    amount: validatedBody.amount,
    description: validatedBody.description
  });
  userItem.updatedBy = user._id.toString();
  await userItem.save();

  return {
    successMessage: "Đã thêm lỗi phạt cho nhân viên.",
    redirectTo: `/users/${userId}/payroll?month=${buildAdjustmentRedirectMonth(validatedBody.month, new Date(validatedBody.date))}`
  };
};

const deleteTimekeeping = async ({ userId, timekeepingId, user }) => {
  const userItem = await User.findById(userId);

  if (!userItem) {
    const error = new Error("Không tìm thấy người dùng.");
    error.statusCode = 404;
    throw error;
  }

  const timekeepingEntry = userItem.timekeeping.id(timekeepingId);

  if (!timekeepingEntry) {
    const error = new Error("Không tìm thấy bản ghi chấm công.");
    error.statusCode = 404;
    throw error;
  }

  if (timekeepingEntry.approved) {
    const error = new Error("Chỉ có thể xóa chấm công đang chờ duyệt.");
    error.statusCode = 400;
    throw error;
  }

  timekeepingEntry.deleteOne();
  userItem.updatedBy = user._id.toString();
  await userItem.save();

  return {
    successMessage: "Xóa chấm công đang chờ duyệt thành công.",
    redirectTo: "/users/timekeeping/pending"
  };
};

const deleteCommission = async ({ userId, commissionId, month, user }) => {
  const userItem = await User.findById(userId);

  if (!userItem) {
    const error = new Error("Không tìm thấy người dùng.");
    error.statusCode = 404;
    throw error;
  }

  ensureStaffUser(userItem);
  userItem.commissions = userItem.commissions || [];

  const commissionEntry = userItem.commissions.id(commissionId);

  if (!commissionEntry) {
    const error = new Error("Không tìm thấy hoa hồng.");
    error.statusCode = 404;
    throw error;
  }

  const redirectMonth = buildAdjustmentRedirectMonth(month, new Date(commissionEntry.date));
  commissionEntry.deleteOne();
  userItem.updatedBy = user._id.toString();
  await userItem.save();

  return {
    successMessage: "Đã xóa hoa hồng thành công.",
    redirectTo: `/users/${userId}/payroll?month=${redirectMonth}`
  };
};

const deleteFault = async ({ userId, faultId, month, user }) => {
  const userItem = await User.findById(userId);

  if (!userItem) {
    const error = new Error("Không tìm thấy người dùng.");
    error.statusCode = 404;
    throw error;
  }

  ensureStaffUser(userItem);
  userItem.faults = userItem.faults || [];

  const faultEntry = userItem.faults.id(faultId);

  if (!faultEntry) {
    const error = new Error("Không tìm thấy lỗi phạt.");
    error.statusCode = 404;
    throw error;
  }

  const redirectMonth = buildAdjustmentRedirectMonth(month, new Date(faultEntry.date));
  faultEntry.deleteOne();
  userItem.updatedBy = user._id.toString();
  await userItem.save();

  return {
    successMessage: "Đã xóa lỗi phạt thành công.",
    redirectTo: `/users/${userId}/payroll?month=${redirectMonth}`
  };
};

module.exports = {
  getIndexData,
  getCreateData,
  getShowData,
  createUser,
  getEditData,
  updateUser,
  getShiftIndexData,
  createShift,
  updateShift,
  updateHourSalarySetting,
  updateCashOnHandSetting,
  updateCommissionSetting,
  getOwnTimekeepingData,
  createTimekeeping,
  createCommissionRequest,
  getPendingTimekeepingData,
  approveTimekeeping,
  deleteTimekeeping,
  approveCommission,
  deleteCommission,
  createFault,
  deleteFault,
  getPayrollData,
  paySalary
};
