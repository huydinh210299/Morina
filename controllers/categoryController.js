const categoryService = require("../services/categoryService");
const { wrapControllerHandlers } = require("../middleware/asyncMiddleware");

const renderIndex = async (req, res) => {
  res.render("pages/categories/index", await categoryService.getIndexData());
};

const renderCreate = (req, res) => {
  res.render("pages/categories/form", categoryService.getCreateData());
};

const create = async (req, res) => {
  const result = await categoryService.createCategory(req);
  req.session.success = result.successMessage;
  res.redirect(result.redirectTo);
};

const renderEdit = async (req, res) => {
  res.render("pages/categories/form", await categoryService.getEditData(req.params.id));
};

const update = async (req, res) => {
  const result = await categoryService.updateCategory({
    id: req.params.id,
    validatedBody: req.validatedBody,
    user: req.user
  });
  req.session.success = result.successMessage;
  res.redirect(result.redirectTo);
};

const remove = async (req, res) => {
  const result = await categoryService.deleteCategory(req.params.id);
  req.session.success = result.successMessage;
  res.redirect(result.redirectTo);
};

module.exports = wrapControllerHandlers({
  renderIndex,
  renderCreate,
  create,
  renderEdit,
  update,
  remove
});
