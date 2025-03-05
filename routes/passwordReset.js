
import express from "express";
import crypto from "crypto";
import User from "../models/user.js";
import { Resend } from 'resend';
import { config} from '../config/dotenv.js'

const resend = new Resend(config.resendApiKey);
const router = express.Router();

// POST /forgot-password
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User with that email does not exist." });
    }

    // Generate a reset token
    const token = crypto.randomBytes(32).toString("hex");

    // Set token and expiration on user (expires in 1 hour)
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Construct reset URL
    const resetURL = `${process.env.FRONTEND_URL}/reset-password/${token}`;

    // Email options
    const mailOptions = {
        from: 'playshelf@resend.dev',
        to: email,
        subject: "Password Reset Request",
        html: `<p>You requested a password reset.</p>
             <p>Click <a href="${resetURL}">here</a> to reset your password.</p>`
    };

    // Send email
    await resend.emails.send(mailOptions);

    res.json({ message: "Password reset email sent." });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Server error." });
  }
});

// POST /reset-password
router.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    // Find the user by token and check expiration
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Password reset token is invalid or has expired." });
    }

    // Set the new password (it will be hashed in the pre-save hook)
    user.password = newPassword;
    // Clear the reset token and expiration
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: "Password has been reset successfully." });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Server error." });
  }
});

export default router;
