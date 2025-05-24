const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const session = require("express-session");
const passport = require("./config/passport");
const connectDB = require("./config/db");
const {
  SERVER_PORT,
  SERVER_URL,
  NODE_ENV,
  SESSION_SECRET,
  CLIENT_URL,
} = require("./config/serverConfig");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const { job } = require("./jobs/cron");
const healthRouter = require("./routes/health.routes");
const authRouter = require("./routes/auth.routes");
const userRouter = require("./routes/user.routes");
const messageRouter = require("./routes/message.routes");
const Message = require("./models/Message");

connectDB();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

if (NODE_ENV === "development") {
  job.start();
}

const connectedUsers = new Map();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join", (userId) => {
    connectedUsers.set(userId, socket.id);
    socket.join(userId);
  });
  socket.on("sendMessage", async (data) => {
    try {
      const { senderId, receiverId, content } = data;

      const message = await Message.create({
        sender: senderId,
        receiver: receiverId,
        content,
        status: "sent",
      });

      const populatedMessage = await Message.findById(message._id)
        .populate("sender", "name profilePicture")
        .populate("receiver", "name profilePicture");

      io.to(senderId).emit("messageReceived", populatedMessage);
      io.to(receiverId).emit("messageReceived", populatedMessage);
    } catch (error) {
      console.error("Message error:", error);
    }
  });

  // Handle typing status
  socket.on("typing", (data) => {
    const { senderId, receiverId, isTyping } = data;
    io.to(receiverId).emit("userTyping", { userId: senderId, isTyping });
  });

  // Handle message status (seen/delivered)
  socket.on("messageStatus", async (data) => {
    try {
      const { messageId, status } = data;

      await Message.findByIdAndUpdate(messageId, { status });

      const message = await Message.findById(messageId)
        .populate("sender", "name profilePicture")
        .populate("receiver", "name profilePicture");

      if (message) {
        io.to(message.sender.toString()).emit("messageStatusUpdated", {
          messageId,
          status,
        });
      }
    } catch (error) {
      console.error("Message status update error:", error);
    }
  });

  socket.on("disconnect", () => {
    for (const [userId, socketId] of connectedUsers.entries()) {
      if (socketId === socket.id) {
        connectedUsers.delete(userId);
        break;
      }
    }
    console.log("User disconnected:", socket.id);
  });
});

app.get("/", (req, res) => {
  return res.status(200).json({
    status: 200,
    error: false,
    message: "Chat server is running",
  });
});

app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/messages", messageRouter);

app.use(notFound);
app.use(errorHandler);

server.listen(SERVER_PORT, () =>
  console.log(`Server running on port ${SERVER_URL}`)
);
