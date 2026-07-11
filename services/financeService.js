const mongoose = require("mongoose");
const Order = require("../models/Order");
const Payment = require("../models/Payment");
const User = require("../models/User");
const { setCreateAuditFields, setUpdateAuditFields } = require("../utils/audit");

const PAGE_SIZE = 10;

const parseMonthInput = (monthInput) => {
  const fallback = new Date();
  const match = typeof monthInput === "string" ? monthInput.match(/^(\d{4})-(\d{2})$/) : null;

  if (!match) {
    return {
      selectedMonth: `${fallback.getFullYear()}-${String(fallback.getMonth() + 1).padStart(2, "0")}`,
      year: fallback.getFullYear(),
      month: fallback.getMonth() + 1,
      start: new Date(fallback.getFullYear(), fallback.getMonth(), 1),
      end: new Date(fallback.getFullYear(), fallback.getMonth() + 1, 1)
    };
  }

  const year = Number(match[1]);
  const month = Number(match[2]);

  return {
    selectedMonth: `${year}-${String(month).padStart(2, "0")}`,
    year,
    month,
    start: new Date(year, month - 1, 1),
    end: new Date(year, month, 1)
  };
};

const normalizePaymentFilters = ({ paymentMonth, paymentYear, page, edit } = {}) => {
  const fallback = new Date();
  const normalizedMonth = Number.parseInt(paymentMonth, 10);
  const normalizedYear = Number.parseInt(paymentYear, 10);
  const resolvedMonth = normalizedMonth >= 1 && normalizedMonth <= 12 ? normalizedMonth : fallback.getMonth() + 1;
  const resolvedYear = normalizedYear >= 2000 ? normalizedYear : fallback.getFullYear();
  const resolvedPage = Math.max(1, Number.parseInt(page, 10) || 1);

  return {
    paymentMonth: resolvedMonth,
    paymentYear: resolvedYear,
    page: resolvedPage,
    edit: typeof edit === "string" && edit ? edit : "",
    start: new Date(resolvedYear, resolvedMonth - 1, 1),
    end: new Date(resolvedYear, resolvedMonth, 1)
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

const buildPaymentRedirect = ({ paymentMonth, paymentYear, page }) =>
  `/finance?tab=payments&paymentMonth=${paymentMonth}&paymentYear=${paymentYear}&page=${page}`;

const findPaymentOrFail = async (id) => {
  if (!mongoose.isValidObjectId(id)) {
    const error = new Error("Không tìm thấy khoản chi.");
    error.statusCode = 404;
    throw error;
  }

  const payment = await Payment.findById(id);

  if (!payment) {
    const error = new Error("Không tìm thấy khoản chi.");
    error.statusCode = 404;
    throw error;
  }

  return payment;
};

const getRevenueSummary = async (range) => {
  const [revenueData, paymentData, staffUsers] = await Promise.all([
    Order.aggregate([
      {
        $match: {
          createdAt: {
            $gte: range.start,
            $lt: range.end
          }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$orderAmount" },
          orderCount: { $sum: 1 }
        }
      }
    ]),
    Payment.aggregate([
      {
        $match: {
          createdAt: {
            $gte: range.start,
            $lt: range.end
          }
        }
      },
      {
        $group: {
          _id: null,
          totalPayment: { $sum: "$amount" },
          paymentCount: { $sum: 1 }
        }
      }
    ]),
    User.find({ role: "staff" }).select("username salary").sort({ username: 1 })
  ]);

  const staffSalaryItems = staffUsers
    .map((userItem) => {
      const salaryEntry = (userItem.salary || []).find(
        (entry) => entry.month === range.month && entry.year === range.year
      );

      return {
        username: userItem.username,
        salary: Number(salaryEntry?.salary || 0)
      };
    })
    .filter((item) => item.salary > 0);

  const totalSalary = staffSalaryItems.reduce((sum, item) => sum + item.salary, 0);
  const totalRevenue = revenueData[0]?.totalRevenue || 0;
  const orderCount = revenueData[0]?.orderCount || 0;
  const totalPayment = paymentData[0]?.totalPayment || 0;
  const paymentCount = paymentData[0]?.paymentCount || 0;

  return {
    selectedMonth: range.selectedMonth,
    year: range.year,
    month: range.month,
    totalRevenue,
    totalSalary,
    totalPayment,
    netRevenue: totalRevenue - totalSalary - totalPayment,
    orderCount,
    paymentCount,
    staffSalaryItems
  };
};

const getPaymentManagementData = async (query = {}) => {
  const normalized = normalizePaymentFilters(query);
  const filter = {
    createdAt: {
      $gte: normalized.start,
      $lt: normalized.end
    }
  };

  const totalItems = await Payment.countDocuments(filter);
  const pagination = buildPagination(normalized.page, totalItems);
  const payments = await Payment.find(filter)
    .sort({ createdAt: -1 })
    .skip((pagination.page - 1) * pagination.pageSize)
    .limit(pagination.pageSize);

  const editingPayment =
    normalized.edit && mongoose.isValidObjectId(normalized.edit)
      ? await Payment.findById(normalized.edit)
      : null;

  return {
    filters: {
      paymentMonth: normalized.paymentMonth,
      paymentYear: normalized.paymentYear
    },
    payments,
    pagination,
    editingPayment
  };
};

const getFinancePageData = async (query = {}) => {
  const activeTab = query.tab === "payments" ? "payments" : "revenue";
  const revenueMonth = parseMonthInput(query.summaryMonth);
  const [revenueSummary, paymentManagement] = await Promise.all([
    getRevenueSummary(revenueMonth),
    getPaymentManagementData(query)
  ]);

  return {
    title: "Finance",
    activeTab,
    revenueSummary,
    paymentManagement
  };
};

const createPayment = async ({ validatedBody, user, query }) => {
  const filters = normalizePaymentFilters(query);

  await Payment.create(
    setCreateAuditFields(
      {
        amount: validatedBody.amount,
        description: validatedBody.description
      },
      user
    )
  );

  return {
    successMessage: "Tạo khoản chi thành công.",
    redirectTo: buildPaymentRedirect(filters)
  };
};

const updatePayment = async ({ id, validatedBody, user, query }) => {
  const filters = normalizePaymentFilters(query);
  await findPaymentOrFail(id);

  await Payment.findByIdAndUpdate(
    id,
    setUpdateAuditFields(
      {
        amount: validatedBody.amount,
        description: validatedBody.description
      },
      user
    ),
    { runValidators: true }
  );

  return {
    successMessage: "Cập nhật khoản chi thành công.",
    redirectTo: buildPaymentRedirect(filters)
  };
};

const deletePayment = async ({ id, query }) => {
  const filters = normalizePaymentFilters(query);
  await findPaymentOrFail(id);
  await Payment.findByIdAndDelete(id);

  return {
    successMessage: "Xóa khoản chi thành công.",
    redirectTo: buildPaymentRedirect(filters)
  };
};

module.exports = {
  getFinancePageData,
  createPayment,
  updatePayment,
  deletePayment
};
