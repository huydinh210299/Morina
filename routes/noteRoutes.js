const express = require("express");
const noteController = require("../controllers/noteController");
const { requireAuth, allowRoles } = require("../middleware/authMiddleware");
const validate = require("../middleware/validationMiddleware");
const { noteSchema } = require("../utils/validators");
const { USER_ROLES } = require("../utils/constants");

const router = express.Router();
router.use(requireAuth, allowRoles(USER_ROLES.ADMIN, USER_ROLES.STAFF));
router.get("/", noteController.renderIndex);
router.get("/new", allowRoles(USER_ROLES.ADMIN), noteController.renderCreate);
router.post("/", allowRoles(USER_ROLES.ADMIN), validate(noteSchema), noteController.create);
router.get("/:id/edit", allowRoles(USER_ROLES.ADMIN), noteController.renderEdit);
router.put("/:id", allowRoles(USER_ROLES.ADMIN), validate(noteSchema), noteController.update);
router.delete("/:id", allowRoles(USER_ROLES.ADMIN), noteController.remove);
module.exports = router;
