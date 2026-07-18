const noteService = require("../services/noteService");
const { wrapControllerHandlers } = require("../middleware/asyncMiddleware");

const renderIndex = async (req, res) => res.render("pages/notes/index", await noteService.getIndexData(req.query));
const renderCreate = async (req, res) => res.render("pages/notes/form", await noteService.getCreateData());
const create = async (req, res) => {
  const result = await noteService.createNote({ validatedBody: req.validatedBody, user: req.user });
  req.session.success = result.successMessage;
  res.redirect(result.redirectTo);
};
const renderEdit = async (req, res) => res.render("pages/notes/form", await noteService.getEditData(req.params.id));
const update = async (req, res) => {
  const result = await noteService.updateNote({ id: req.params.id, validatedBody: req.validatedBody, user: req.user });
  req.session.success = result.successMessage;
  res.redirect(result.redirectTo);
};
const remove = async (req, res) => {
  const result = await noteService.deleteNote(req.params.id);
  req.session.success = result.successMessage;
  res.redirect(result.redirectTo);
};

module.exports = wrapControllerHandlers({ renderIndex, renderCreate, create, renderEdit, update, remove });
