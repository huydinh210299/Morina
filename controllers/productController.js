const productService = require("../services/productService");
const { wrapControllerHandlers } = require("../middleware/asyncMiddleware");

const renderIndex = async (req, res) => {
  res.render("pages/products/index", await productService.getIndexData(req.query));
};

const renderCreate = async (req, res) => {
  res.render("pages/products/form", await productService.getCreateData());
};

const create = async (req, res) => {
  const result = await productService.createProduct(req);
  req.session.success = result.successMessage;
  res.redirect(result.redirectTo);
};

const renderEdit = async (req, res) => {
  res.render("pages/products/form", await productService.getEditData(req.params.id));
};

const renderShow = async (req, res) => {
  res.render("pages/products/show", await productService.getShowData(req.params.id));
};

const renderSchedule = async (req, res) => {
  res.render("pages/products/schedule", await productService.getScheduleData(req.params.id));
};

const update = async (req, res) => {
  const result = await productService.updateProduct({
    id: req.params.id,
    validatedBody: req.validatedBody,
    user: req.user
  });
  req.session.success = result.successMessage;
  res.redirect(result.redirectTo);
};

const remove = async (req, res) => {
  const result = await productService.archiveProduct({
    id: req.params.id,
    user: req.user
  });
  req.session.success = result.successMessage;
  res.redirect(result.redirectTo);
};

module.exports = wrapControllerHandlers({
  renderIndex,
  renderCreate,
  create,
  renderShow,
  renderSchedule,
  renderEdit,
  update,
  remove
});
