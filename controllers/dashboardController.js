const dashboardService = require("../services/dashboardService");
const { wrapControllerHandlers } = require("../middleware/asyncMiddleware");

const renderDashboard = async (req, res) => {
  res.render("pages/dashboard/index", await dashboardService.getDashboardData(req.user));
};

module.exports = wrapControllerHandlers({
  renderDashboard
});
