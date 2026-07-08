const express = require("express");
const accessoryController = require("../controllers/accessoryController");
const { requireAuth, allowRoles } = require("../middleware/authMiddleware");
const validate = require("../middleware/validationMiddleware");
const { accessorySchema } = require("../utils/validators");
const { USER_ROLES } = require("../utils/constants");

const router = express.Router();

router.use(requireAuth, allowRoles(USER_ROLES.ADMIN, USER_ROLES.STAFF));
router.get("/", accessoryController.renderIndex);
router.get("/new", allowRoles(USER_ROLES.ADMIN), accessoryController.renderCreate);
router.post("/", allowRoles(USER_ROLES.ADMIN), validate(accessorySchema), accessoryController.create);
router.get("/:id/edit", allowRoles(USER_ROLES.ADMIN), accessoryController.renderEdit);
router.put("/:id", allowRoles(USER_ROLES.ADMIN), validate(accessorySchema), accessoryController.update);
router.delete("/:id", allowRoles(USER_ROLES.ADMIN), accessoryController.remove);

module.exports = router;
