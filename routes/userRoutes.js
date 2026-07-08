const express = require("express");
const userController = require("../controllers/userController");
const { requireAuth, allowRoles } = require("../middleware/authMiddleware");
const validate = require("../middleware/validationMiddleware");
const {
  userCreateSchema,
  userUpdateSchema,
  shiftSchema,
  timekeepingCreateSchema,
  settingValueSchema,
  payrollPaymentSchema
} = require("../utils/validators");
const { USER_ROLES } = require("../utils/constants");

const router = express.Router();

router.use(requireAuth);

router.get(
  "/timekeeping",
  allowRoles(USER_ROLES.ADMIN, USER_ROLES.STAFF),
  userController.renderOwnTimekeeping
);
router.post(
  "/timekeeping",
  allowRoles(USER_ROLES.ADMIN, USER_ROLES.STAFF),
  validate(timekeepingCreateSchema),
  userController.createTimekeeping
);

router.get(
  "/timekeeping/pending",
  allowRoles(USER_ROLES.ADMIN),
  userController.renderPendingTimekeeping
);
router.post(
  "/:userId/timekeeping/:timekeepingId/approve",
  allowRoles(USER_ROLES.ADMIN),
  userController.approveTimekeeping
);
router.delete(
  "/:userId/timekeeping/:timekeepingId",
  allowRoles(USER_ROLES.ADMIN),
  userController.deleteTimekeeping
);

router.get("/", allowRoles(USER_ROLES.ADMIN), userController.renderIndex);
router.get("/new", allowRoles(USER_ROLES.ADMIN), userController.renderCreate);
router.post("/", allowRoles(USER_ROLES.ADMIN), validate(userCreateSchema), userController.create);
router.get("/shifts", allowRoles(USER_ROLES.ADMIN), userController.renderShiftIndex);
router.post("/shifts", allowRoles(USER_ROLES.ADMIN), validate(shiftSchema), userController.createShift);
router.put("/shifts/:id", allowRoles(USER_ROLES.ADMIN), validate(shiftSchema), userController.updateShift);
router.post(
  "/settings/hour-salary",
  allowRoles(USER_ROLES.ADMIN),
  validate(settingValueSchema),
  userController.updateHourSalary
);
router.post(
  "/settings/cash-on-hand",
  allowRoles(USER_ROLES.ADMIN),
  validate(settingValueSchema),
  userController.updateCashOnHand
);
router.post(
  "/settings/commission",
  allowRoles(USER_ROLES.ADMIN),
  validate(settingValueSchema),
  userController.updateCommission
);
router.get("/:id/payroll", allowRoles(USER_ROLES.ADMIN), userController.renderPayroll);
router.post(
  "/:id/payroll/pay",
  allowRoles(USER_ROLES.ADMIN),
  validate(payrollPaymentSchema),
  userController.paySalary
);
router.get("/:id", allowRoles(USER_ROLES.ADMIN), userController.renderShow);
router.get("/:id/edit", allowRoles(USER_ROLES.ADMIN), userController.renderEdit);
router.put("/:id", allowRoles(USER_ROLES.ADMIN), validate(userUpdateSchema), userController.update);

module.exports = router;
