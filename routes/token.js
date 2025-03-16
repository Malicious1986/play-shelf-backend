import express from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/dotenv.js";

const router = express.Router();

router.post("/refresh-token", (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken)
    return res.status(401).json({ message: "No refresh token" });

  try {
    const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret);

    // Create new Access Token
    const newAccessToken = jwt.sign(
      {
        id: decoded.id,
        name: decoded.name,
        email: decoded.email,
        avatar: decoded.avatar,
      },
      config.jwtSecret,
      { expiresIn: "15m" }
    );

    res.json({ accessToken: newAccessToken });
  } catch (err) {
    res.status(403).json({ message: "Invalid refresh token" });
  }
});

// Logout Route (Clears Refresh Token)
router.post("/logout", async (req, res) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: true,
    sameSite: "Strict",
  });

  // Destroy session
  req.session.destroy(() => {
    console.log("Session destroyed");
  });

  // Flush Apollo Server cache
  if (req.app && req.app.locals && req.app.locals.apolloServer) {
    try {
      await req.app.locals.apolloServer.cache.flushAll();
      console.log("Apollo Server cache flushed");
    } catch (err) {
      console.error("Failed to flush Apollo cache:", err);
    }
  }

  // Respond with success instead of redirecting
  res.status(200).json({ message: "Logged out successfully" });
});

export default router;
