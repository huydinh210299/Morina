const userService = require("../services/userService");
const { wrapControllerHandlers } = require("../middleware/asyncMiddleware");

const renderIndex = async (req, res) => {
  res.render("pages/users/index", await userService.getIndexData());
};

const renderCreate = (req, res) => {
  res.render("pages/users/form", userService.getCreateData());
};

const renderShow = async (req, res) => {
  res.render("pages/users/show", await userService.getShowData(req.params.id));
};

const create = async (req, res) => {
  const result = await userService.createUser({
    validatedBody: req.validatedBody,
    user: req.user
  });
  req.session.success = result.successMessage;
  res.redirect(result.redirectTo);
};

const renderEdit = async (req, res) => {
  res.render("pages/users/form", await userService.getEditData(req.params.id));
};

const update = async (req, res) => {
  const result = await userService.updateUser({
    id: req.params.id,
    validatedBody: req.validatedBody,
    user: req.user
  });
  req.session.success = result.successMessage;
  res.redirect(result.redirectTo);
};

const renderShiftIndex = async (req, res) => {
  res.render("pages/users/shifts", await userService.getShiftIndexData({ editShiftId: req.query.edit }));
};

const createShift = async (req, res) => {
  const result = await userService.createShift({
    validatedBody: req.validatedBody,
    user: req.user
  });
  req.session.success = result.successMessage;
  res.redirect(result.redirectTo);
};

const updateShift = async (req, res) => {
  const result = await userService.updateShift({
    id: req.params.id,
    validatedBody: req.validatedBody,
    user: req.user
  });
  req.session.success = result.successMessage;
  res.redirect(result.redirectTo);
};

const updateHourSalary = async (req, res) => {
  const result = await userService.updateHourSalarySetting({
    validatedBody: req.validatedBody,
    user: req.user
  });
  req.session.success = result.successMessage;
  res.redirect(result.redirectTo);
};

const updateCashOnHand = async (req, res) => {
  const result = await userService.updateCashOnHandSetting({
    validatedBody: req.validatedBody,
    user: req.user
  });
  req.session.success = result.successMessage;
  res.redirect(result.redirectTo);
};

const updateCommission = async (req, res) => {
  const result = await userService.updateCommissionSetting({
    validatedBody: req.validatedBody,
    user: req.user
  });
  req.session.success = result.successMessage;
  res.redirect(result.redirectTo);
};

const renderOwnTimekeeping = async (req, res) => {
  res.render(
    "pages/users/timekeeping",
    await userService.getOwnTimekeepingData({
      userId: req.user._id,
      month: req.query.month
    })
  );
};

const createTimekeeping = async (req, res) => {
  const result = await userService.createTimekeeping({
    userId: req.user._id,
    validatedBody: req.validatedBody,
    user: req.user
  });
  req.session.success = result.successMessage;
  res.redirect(result.redirectTo);
};

const renderPendingTimekeeping = async (req, res) => {
  res.render(
    "pages/users/pending-timekeeping",
    await userService.getPendingTimekeepingData({
      month: req.query.month
    })
  );
};

const approveTimekeeping = async (req, res) => {
  const result = await userService.approveTimekeeping({
    userId: req.params.userId,
    timekeepingId: req.params.timekeepingId,
    user: req.user
  });
  req.session.success = result.successMessage;
  res.redirect(result.redirectTo);
};

const deleteTimekeeping = async (req, res) => {
  const result = await userService.deleteTimekeeping({
    userId: req.params.userId,
    timekeepingId: req.params.timekeepingId,
    user: req.user
  });
  req.session.success = result.successMessage;
  res.redirect(result.redirectTo);
};

const renderPayroll = async (req, res) => {
  res.render(
    "pages/users/payroll",
    await userService.getPayrollData({
      userId: req.params.id,
      month: req.query.month
    })
  );
};

const paySalary = async (req, res) => {
  const result = await userService.paySalary({
    userId: req.params.id,
    month: req.validatedBody.month,
    user: req.user
  });
  req.session.success = result.successMessage;
  res.redirect(result.redirectTo);
};

module.exports = wrapControllerHandlers({
  renderIndex,
  renderCreate,
  renderShow,
  create,
  renderEdit,
  update,
  renderShiftIndex,
  createShift,
  updateShift,
  updateHourSalary,
  updateCashOnHand,
  updateCommission,
  renderOwnTimekeeping,
  createTimekeeping,
  renderPendingTimekeeping,
  approveTimekeeping,
  deleteTimekeeping,
  renderPayroll,
  paySalary
});
