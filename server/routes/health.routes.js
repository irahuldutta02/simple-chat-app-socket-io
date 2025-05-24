const express = require("express");
const {
  healthController,
} = require("../controllers/healthController/healthController");
const healthRouter = express.Router();

healthRouter.get("/check", healthController);

module.exports = healthRouter;
