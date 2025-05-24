require("dotenv").config();

const NODE_ENV = process.env.NODE_ENV;
const MONGO_URI = process.env.MONGO_URI;
const SERVER_PORT = process.env.SERVER_PORT;
const SERVER_URL = process.env.SERVER_URL;
const API_URL = process.env.API_URL;
const JWT_SECRET = process.env.JWT_SECRET;
const SESSION_SECRET = process.env.SESSION_SECRET;
const CLIENT_URL = process.env.CLIENT_URL;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL;

module.exports = {
  NODE_ENV,
  MONGO_URI,
  SERVER_PORT,
  SERVER_URL,
  API_URL,
  JWT_SECRET,
  SESSION_SECRET,
  CLIENT_URL,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL,
};
