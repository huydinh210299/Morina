const customerService = require("../services/customerService");
const { wrapControllerHandlers } = require("../middleware/asyncMiddleware");

const renderIndex = async (req, res) => {
  res.render("pages/customers/index", await customerService.getIndexData(req.query));
};

const renderEdit = async (req, res) => {
  res.render("pages/customers/form", { ...(await customerService.getEditData(req.params.id)), error: null });
};

const update = async (req, res) => {
  try {
    await customerService.updateCustomer({ id: req.params.id, body: req.body });
  } catch (error) {
    if (error.statusCode !== 400) throw error;
    const data = await customerService.getEditData(req.params.id);
    return res.status(400).render("pages/customers/form", {
      ...data,
      customer: { _id: data.customer._id, totalOrder: data.customer.totalOrder, name: req.body.name, phone: req.body.phone },
      error: error.message
    });
  }
  req.session.success = "Cập nhật khách hàng thành công.";
  res.redirect("/customers");
};

const remove = async (req, res) => {
  await customerService.deleteCustomer(req.params.id);
  req.session.success = "Xóa khách hàng thành công.";
  res.redirect("/customers");
};

module.exports = wrapControllerHandlers({ renderIndex, renderEdit, update, remove });
