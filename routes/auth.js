import passport from "passport";
import express from "express";

const router = express.Router();

router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get(
    "/google/callback",
    passport.authenticate("google", { failureRedirect: "/login-failed" }),
    (req, res) => {
      const { token, refreshToken } = req.user;
  
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        domain: process.env.COOKIE_DOMAIN,
        path: "/",
      });
  
      res.redirect(`${process.env.FRONTEND_URL}/auth-success?token=${token}`);
    }
  );

export default router;
