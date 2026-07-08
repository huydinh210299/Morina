const express = require("express");
const categoryController = require("../controllers/categoryController");
const { requireAuth, allowRoles } = require("../middleware/authMiddleware");
const validate = require("../middleware/validationMiddleware");
const { categorySchema } = require("../utils/validators");
const { USER_ROLES } = require("../utils/constants");

const router = express.Router();

router.use(requireAuth, allowRoles(USER_ROLES.ADMIN, USER_ROLES.STAFF));
router.get("/", categoryController.renderIndex);
router.get("/new", allowRoles(USER_ROLES.ADMIN), categoryController.renderCreate);
router.post("/", allowRoles(USER_ROLES.ADMIN), validate(categorySchema), categoryController.create);
router.get("/:id/edit", allowRoles(USER_ROLES.ADMIN), categoryController.renderEdit);
router.put("/:id", allowRoles(USER_ROLES.ADMIN), validate(categorySchema), categoryController.update);
router.delete("/:id", allowRoles(USER_ROLES.ADMIN), categoryController.remove);

module.exports = router;
