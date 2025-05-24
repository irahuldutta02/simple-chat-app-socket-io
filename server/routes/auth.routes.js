const express = require("express");
const passport = require("../config/passport");
const { CLIENT_URL } = require("../config/serverConfig");
const authRouter = express.Router();

authRouter.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

authRouter.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: `${CLIENT_URL}/login` }),
  (req, res) => {
    res.redirect(`${CLIENT_URL}/chat`);
  }
);

authRouter.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: "Logout failed" });
    }
    res.redirect(CLIENT_URL);
  });
});

authRouter.get("/user", (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      success: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        profilePicture: req.user.profilePicture,
      },
    });
  } else {
    res.status(401).json({ success: false, message: "Not authenticated" });
  }
});

module.exports = authRouter;
