const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const { SERVER_PORT, SERVER_URL, NODE_ENV } = require("./config/serverConfig");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const { job } = require("./jobs/cron");
const healthRouter = require("./routes/health.routes");

connectDB();

const app = express();

app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (NODE_ENV !== "production") {
  job.start();
}

app.get("/", (req, res) => {
  return res.status(200).json({
    status: 200,
    error: false,
    message: "Server is running",
  });
});

app.use("/api/health", healthRouter);

app.use(notFound);
app.use(errorHandler);

app.listen(SERVER_PORT, () =>
  console.log(`Server running on port ${SERVER_URL}`)
);
