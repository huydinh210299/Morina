const express = require("express");
const financeController = require("../controllers/financeController");
const { requireAuth, allowRoles } = require("../middleware/authMiddleware");
const validate = require("../middleware/validationMiddleware");
const { financePaymentSchema, financeEntrySchema } = require("../utils/validators");
const { USER_ROLES } = require("../utils/constants");

const router = express.Router();

router.use(requireAuth, allowRoles(USER_ROLES.ADMIN));

router.get("/", financeController.renderIndex);
router.post("/payments", validate(financePaymentSchema), financeController.createPayment);
router.put("/payments/:id", validate(financePaymentSchema), financeController.updatePayment);
router.delete("/payments/:id", financeController.deletePayment);
router.post("/entries", validate(financeEntrySchema), financeController.createEntry);
router.put("/entries/:id", validate(financeEntrySchema), financeController.updateEntry);
router.delete("/entries/:id", financeController.deleteEntry);

module.exports = router;
