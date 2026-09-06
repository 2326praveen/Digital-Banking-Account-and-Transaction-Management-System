const dashboardService = require('../services/staffDashboardService');

async function dashboard(req, res) {
  const data = await dashboardService.getDashboard(req.query.from, req.query.to);
  res.json({ success: true, data });
}

module.exports = { dashboard };