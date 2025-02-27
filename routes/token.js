import express from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/dotenv.js";

const router = express.Router();

router.post("/refresh-token", (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) return res.status(401).json({ message: "No refresh token" });

  try {
    const decoded = jwt.verify(refreshToken,config.jwtRefreshSecret);

    // Create new Access Token
    const newAccessToken = jwt.sign(
      { id: decoded.id, name: decoded.name, email: decoded.email, avatar: decoded.avatar },
      config.jwtSecret,
      { expiresIn: "15m" }
    );

    res.json({ accessToken: newAccessToken });
  } catch (err) {
    res.status(403).json({ message: "Invalid refresh token" });
  }
});

// Logout Route (Clears Refresh Token)
router.post("/logout", (req, res) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: true,
    sameSite: "Strict",
  });

  // Respond with success instead of redirecting
  res.status(200).json({ message: "Logged out successfully" });
});

export default router;
