const accessoryService = require("../services/accessoryService");
const { wrapControllerHandlers } = require("../middleware/asyncMiddleware");

const renderIndex = async (req, res) => {
  res.render("pages/accessories/index", await accessoryService.getIndexData(req.query));
};

const renderRentalSchedule = async (req, res) => {
  res.render("pages/accessories/rentals", await accessoryService.getRentalScheduleData(req.params.id, req.query));
};

const renderShow = async (req, res) => {
  res.render("pages/accessories/show", await accessoryService.getShowData(req.params.id));
};

const renderCreate = (req, res) => {
  res.render("pages/accessories/form", accessoryService.getCreateData());
};

const create = async (req, res) => {
  const result = await accessoryService.createAccessory(req);
  req.session.success = result.successMessage;
  res.redirect(result.redirectTo);
};

const renderEdit = async (req, res) => {
  res.render("pages/accessories/form", await accessoryService.getEditData(req.params.id));
};

const update = async (req, res) => {
  const result = await accessoryService.updateAccessory({
    id: req.params.id,
    validatedBody: req.validatedBody,
    user: req.user
  });
  req.session.success = result.successMessage;
  res.redirect(result.redirectTo);
};

const remove = async (req, res) => {
  const result = await accessoryService.deleteAccessory(req.params.id);
  req.session.success = result.successMessage;
  res.redirect(result.redirectTo);
};

module.exports = wrapControllerHandlers({
  renderIndex,
  renderRentalSchedule,
  renderShow,
  renderCreate,
  create,
  renderEdit,
  update,
  remove
});
