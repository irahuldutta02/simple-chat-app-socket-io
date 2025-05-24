require("dotenv").config();

const NODE_ENV = process.env.NODE_ENV;
const MONGO_URI = process.env.MONGO_URI;
const SERVER_PORT = process.env.SERVER_PORT;
const SERVER_URL = process.env.SERVER_URL;
const API_URL = process.env.API_URL;
const JWT_SECRET = process.env.JWT_SECRET;
const SESSION_SECRET = process.env.SESSION_SECRET;
const CLIENT_URL = process.env.CLIENT_URL;

module.exports = {
  NODE_ENV,
  MONGO_URI,
  SERVER_PORT,
  SERVER_URL,
  API_URL,
  JWT_SECRET,
  SESSION_SECRET,
  CLIENT_URL,
};
