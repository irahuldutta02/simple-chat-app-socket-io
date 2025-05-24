const express = require("express");
const Message = require("../models/Message");
const User = require("../models/User");
const messageRouter = express.Router();

const requireAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ success: false, message: "Authentication required" });
};

// Get messages with a specific user with pagination
messageRouter.get("/:userId", requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    // Find messages between the users
    const messages = await Message.find({
      $or: [
        { sender: currentUserId, receiver: userId },
        { sender: userId, receiver: currentUserId },
      ],
    })
      .populate("sender", "name profilePicture")
      .populate("receiver", "name profilePicture")
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ timestamp: 1 });

    // Update status of messages from the other user to "delivered" if they're "sent"
    await Message.updateMany(
      {
        sender: userId,
        receiver: currentUserId,
        status: "sent",
      },
      {
        status: "delivered",
      }
    );

    const total = await Message.countDocuments({
      $or: [
        { sender: currentUserId, receiver: userId },
        { sender: userId, receiver: currentUserId },
      ],
    });

    res.json({
      success: true,
      messages,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        hasMore: skip + messages.length < total,
      },
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch messages" });
  }
});

// Get all conversations for the current user
messageRouter.get("/conversations/history", requireAuth, async (req, res) => {
  try {
    const currentUserId = req.user._id;

    // Find all messages where the current user is either sender or receiver
    const messages = await Message.find({
      $or: [{ sender: currentUserId }, { receiver: currentUserId }],
    })
      .sort({ timestamp: -1 })
      .populate("sender", "name email profilePicture")
      .populate("receiver", "name email profilePicture");

    // Extract unique conversation partners
    const conversationMap = new Map();

    messages.forEach((message) => {
      const partnerId =
        message.sender._id.toString() === currentUserId.toString()
          ? message.receiver._id.toString()
          : message.sender._id.toString();

      if (!conversationMap.has(partnerId)) {
        const partner =
          message.sender._id.toString() === currentUserId.toString()
            ? message.receiver
            : message.sender;

        conversationMap.set(partnerId, {
          _id: partnerId,
          user: partner,
          lastMessage: message.content,
          timestamp: message.timestamp,
          unread: 0,
        });
      }
    });

    // Count unread messages for each conversation
    const unreadCounts = await Message.aggregate([
      {
        $match: {
          receiver: currentUserId,
          isRead: false,
        },
      },
      {
        $group: {
          _id: "$sender",
          count: { $sum: 1 },
        },
      },
    ]);

    // Add unread counts to conversations
    unreadCounts.forEach((item) => {
      const partnerId = item._id.toString();
      if (conversationMap.has(partnerId)) {
        conversationMap.get(partnerId).unread = item.count;
      }
    });

    // Convert map to array and sort by most recent message
    const conversations = Array.from(conversationMap.values()).sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

    res.json({ success: true, conversations });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch conversations" });
  }
});

// Mark all messages from a specific user as read
messageRouter.put("/:userId/read", requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    // Update all unread messages from this sender to this receiver
    const result = await Message.updateMany(
      {
        sender: userId,
        receiver: currentUserId,
        isRead: false,
      },
      {
        isRead: true,
        status: "seen",
      }
    );

    res.json({
      success: true,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to mark messages as read" });
  }
});

module.exports = messageRouter;
