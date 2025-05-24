const express = require("express");
const User = require("../models/User");
const userRouter = express.Router();

const requireAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ success: false, message: "Authentication required" });
};

userRouter.get("/search", requireAuth, async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res
        .status(400)
        .json({ success: false, message: "Search query required" });
    }

    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } },
        {
          $or: [
            { name: { $regex: query, $options: "i" } },
            { email: { $regex: query, $options: "i" } },
          ],
        },
      ],
    })
      .select("name email profilePicture")
      .limit(10);

    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: "Search failed" });
  }
});

module.exports = userRouter;
