const express = require("express");
const productController = require("../controllers/productController");
const { requireAuth, allowRoles } = require("../middleware/authMiddleware");
const validate = require("../middleware/validationMiddleware");
const { productSchema } = require("../utils/validators");
const { USER_ROLES } = require("../utils/constants");

const router = express.Router();

router.use(requireAuth, allowRoles(USER_ROLES.ADMIN, USER_ROLES.STAFF));
router.get("/", productController.renderIndex);
router.get("/images", productController.renderImages);
router.get("/new", allowRoles(USER_ROLES.ADMIN), productController.renderCreate);
router.post("/", allowRoles(USER_ROLES.ADMIN), validate(productSchema), productController.create);
router.get("/:id", productController.renderShow);
router.get("/:id/schedule", productController.renderSchedule);
router.get("/:id/edit", allowRoles(USER_ROLES.ADMIN), productController.renderEdit);
router.put("/:id", allowRoles(USER_ROLES.ADMIN), validate(productSchema), productController.update);
router.delete("/:id", allowRoles(USER_ROLES.ADMIN), productController.remove);

module.exports = router;
