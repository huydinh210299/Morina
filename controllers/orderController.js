const orderService = require("../services/orderService");
const { wrapControllerHandlers } = require("../middleware/asyncMiddleware");

const renderIndex = async (req, res) => {
  res.render("pages/orders/index", await orderService.getIndexData(req.query));
};

const renderCreate = async (req, res) => {
  res.render("pages/orders/form", await orderService.getCreateData());
};

const create = async (req, res) => {
  try {
    const result = await orderService.createOrder(req);
    req.session.success = result.successMessage;
    res.redirect(result.redirectTo);
  } catch (error) {
    if (error.code === 11000) {
      error.statusCode = 400;
      error.message = `Phát hiện giá trị trùng lặp cho ${Object.keys(error.keyPattern).join(", ")}.`;
    }

    res
      .status(error.statusCode || 400)
      .render("pages/orders/form", await orderService.getCreateDataFromBody(req.body, error.message));
  }
};

const renderEdit = async (req, res) => {
  res.render("pages/orders/form", await orderService.getEditData(req.params.id));
};

const update = async (req, res) => {
  const result = await orderService.updateOrder({
    id: req.params.id,
    body: req.body,
    user: req.user
  });
  req.session.success = result.successMessage;
  res.redirect(result.redirectTo);
};

const remove = async (req, res) => {
  const result = await orderService.deleteOrder(req.params.id);
  req.session.success = result.successMessage;
  res.redirect(result.redirectTo);
};

const renderShow = async (req, res) => {
  res.render("pages/orders/show", await orderService.getShowData(req.params.id));
};

const addPayment = async (req, res) => {
  const result = await orderService.addOrderPayment({
    id: req.params.id,
    body: req.body,
    user: req.user
  });
  req.session.success = result.successMessage;
  res.redirect(result.redirectTo);
};

const updateStatus = async (req, res) => {
  const result = await orderService.updateOrderStatus({
    id: req.params.id,
    body: req.body,
    user: req.user
  });
  req.session.success = result.successMessage;
  res.redirect(result.redirectTo);
};

module.exports = wrapControllerHandlers({
  renderIndex,
  renderCreate,
  create,
  renderEdit,
  update,
  remove,
  renderShow,
  addPayment,
  updateStatus
});
