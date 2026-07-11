const orderService = require("../services/orderService");
const { wrapControllerHandlers } = require("../middleware/asyncMiddleware");

const renderIndex = async (req, res) => {
  res.render("pages/orders/index", await orderService.getIndexData(req.query));
};

const renderCreate = async (req, res) => {
  res.render("pages/orders/form", await orderService.getCreateData());
};

const renderOrderFormError = async (res, { id, body, message, statusCode }) => {
  const viewData = id
    ? await orderService.getEditDataFromBody(id, body, message)
    : await orderService.getCreateDataFromBody(body, message);

  res.status(statusCode || 400).render("pages/orders/form", viewData);
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

    await renderOrderFormError(res, {
      body: req.body,
      message: error.message,
      statusCode: error.statusCode
    });
  }
};

const renderEdit = async (req, res) => {
  res.render("pages/orders/form", await orderService.getEditData(req.params.id));
};

const checkConflicts = async (req, res) => {
  res.json(
    await orderService.checkOrderConflicts({
      id: req.body.currentOrderId,
      body: req.body
    })
  );
};

const update = async (req, res) => {
  try {
    const result = await orderService.updateOrder({
      id: req.params.id,
      body: req.body,
      user: req.user
    });
    req.session.success = result.successMessage;
    res.redirect(result.redirectTo);
  } catch (error) {
    await renderOrderFormError(res, {
      id: req.params.id,
      body: req.body,
      message: error.message,
      statusCode: error.statusCode
    });
  }
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
  checkConflicts,
  create,
  renderEdit,
  update,
  remove,
  renderShow,
  addPayment,
  updateStatus
});
