const authService = require("../services/authService");
const { wrapControllerHandlers } = require("../middleware/asyncMiddleware");

const renderLogin = (req, res) => {
  const result = authService.getLoginData(req.user);

  if (result.redirectTo) {
    return res.redirect(result.redirectTo);
  }

  return res.render("pages/auth/login", result);
};

const login = async (req, res) => {
  const result = await authService.loginUser(req);

  if (result.errorMessage) {
    req.session.error = result.errorMessage;
    return res.redirect(result.redirectTo);
  }

  res.cookie(result.cookieName, result.token, result.cookieOptions);
  req.session.success = result.successMessage;
  return res.redirect(result.redirectTo);
};

const logout = (req, res) => {
  const result = authService.logoutUser();
  res.clearCookie(result.cookieName);
  req.session.success = result.successMessage;
  return res.redirect(result.redirectTo);
};

module.exports = wrapControllerHandlers({
  renderLogin,
  login,
  logout
});
