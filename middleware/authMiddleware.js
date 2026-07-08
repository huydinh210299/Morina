const jwt = require("jsonwebtoken");
const User = require("../models/User");

const attachUser = async (req, res, next) => {
  const token = req.cookies[process.env.COOKIE_NAME || "rentalshop_token"];
  res.locals.currentUser = null;

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");
    req.user = user || null;
    res.locals.currentUser = user || null;
  } catch (error) {
    req.user = null;
    res.locals.currentUser = null;
  }

  return next();
};

const requireAuth = (req, res, next) => {
  if (!req.user) {
    req.session.error = "Đăng nhập để tiếp tục.";
    return res.redirect("/auth/login");
  }

  return next();
};

const allowRoles = (...roles) => (req, res, next) => {
  if (!req.user) {
    req.session.error = "Đăng nhập để tiếp tục.";
    return res.redirect("/auth/login");
  }

  if (!roles.includes(req.user.role)) {
    req.session.error = "Bạn không có quyền truy cập vào tài nguyên này.";
    return res.redirect("/dashboard");
  }

  return next();
};

module.exports = {
  attachUser,
  requireAuth,
  allowRoles
};
