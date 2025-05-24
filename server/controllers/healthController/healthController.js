const asyncHandler = require("express-async-handler");
const { NODE_ENV } = require("../../config/serverConfig");

const healthController = asyncHandler(async (req, res) => {
  try {
    return res.status(200).json({
      status: 200,
      error: false,
      message: "Server is running",
      data: {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: NODE_ENV,
      },
    });
  } catch (error) {
    res.status(500);
    throw error;
  }
});

module.exports = { healthController };
