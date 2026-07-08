const financeService = require("../services/financeService");
const { wrapControllerHandlers } = require("../middleware/asyncMiddleware");

const renderIndex = async (req, res) => {
  res.render("pages/finance/index", await financeService.getFinancePageData(req.query));
};

const createPayment = async (req, res) => {
  const result = await financeService.createPayment({
    validatedBody: req.validatedBody,
    user: req.user,
    query: req.query
  });
  req.session.success = result.successMessage;
  res.redirect(result.redirectTo);
};

const updatePayment = async (req, res) => {
  const result = await financeService.updatePayment({
    id: req.params.id,
    validatedBody: req.validatedBody,
    user: req.user,
    query: req.query
  });
  req.session.success = result.successMessage;
  res.redirect(result.redirectTo);
};

const deletePayment = async (req, res) => {
  const result = await financeService.deletePayment({
    id: req.params.id,
    query: req.query
  });
  req.session.success = result.successMessage;
  res.redirect(result.redirectTo);
};

module.exports = wrapControllerHandlers({
  renderIndex,
  createPayment,
  updatePayment,
  deletePayment
});
