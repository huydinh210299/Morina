const express = require("express");
const authController = require("../controllers/authController");
const validate = require("../middleware/validationMiddleware");
const { userLoginSchema } = require("../utils/validators");

const router = express.Router();

router.get("/login", authController.renderLogin);
router.post("/login", validate(userLoginSchema), authController.login);
router.post("/logout", authController.logout);

module.exports = router;
