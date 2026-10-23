const express = require("express");
const controller = require("../controllers/customerController");
const { requireAuth, allowRoles } = require("../middleware/authMiddleware");
const { USER_ROLES } = require("../utils/constants");

const router = express.Router();
router.use(requireAuth, allowRoles(USER_ROLES.ADMIN, USER_ROLES.STAFF));
router.get("/", controller.renderIndex);
router.get("/:id/edit", allowRoles(USER_ROLES.ADMIN), controller.renderEdit);
router.put("/:id", allowRoles(USER_ROLES.ADMIN), controller.update);
router.delete("/:id", allowRoles(USER_ROLES.ADMIN), controller.remove);
module.exports = router;
