const { NODE_ENV } = require("../config/serverConfig");

const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;

  if (NODE_ENV === "development") {
    console.error({
      message: err.message,
      stack: err.stack,
    });
  }

  if (err.name === "CastError" && err.kind === "ObjectId") {
    statusCode = 400;
    message = "Resource not found";
  }

  res.status(statusCode);
  res.json({
    status: statusCode,
    message: message,
    stack: NODE_ENV === "development" ? err.stack : null,
  });
};

const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

module.exports = { errorHandler, notFound };
