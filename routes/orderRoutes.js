const express = require("express");
const orderController = require("../controllers/orderController");
const { requireAuth, allowRoles } = require("../middleware/authMiddleware");
const { USER_ROLES } = require("../utils/constants");

const router = express.Router();

router.use(requireAuth, allowRoles(USER_ROLES.ADMIN, USER_ROLES.STAFF));
router.get("/", orderController.renderIndex);
router.get("/new", orderController.renderCreate);
router.post("/", orderController.create);
router.post("/:id/payments", orderController.addPayment);
router.post("/:id/status", orderController.updateStatus);
router.get("/:id", orderController.renderShow);
router.get("/:id/edit", allowRoles(USER_ROLES.ADMIN), orderController.renderEdit);
router.put("/:id", allowRoles(USER_ROLES.ADMIN), orderController.update);
router.delete("/:id", allowRoles(USER_ROLES.ADMIN), orderController.remove);

module.exports = router;
