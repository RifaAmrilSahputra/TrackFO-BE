import dashboardService from "../services/dashboard.service.js";

async function getDashboard(req, res, next) {
  try {

    const result =
      await dashboardService.getDashboard();

    res.json({
      success: true,
      data: result,
    });

  } catch (err) {

    next(err);

  }
}

export {
  getDashboard,
};