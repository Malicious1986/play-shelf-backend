import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "./models/user.js";
import cloudinary from "cloudinary";

dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.CALLBACK_URL}/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          // Upload Google Avatar to Cloudinary
          const cloudinaryResult = await cloudinary.v2.uploader.upload(
            profile.photos[0].value,
            {
              folder: "user_avatars", // Save in a specific folder in Cloudinary
              public_id: `google_${profile.id}`, // Unique ID for the image
              overwrite: true, // Overwrite if user logs in again
            }
          );

          user = await User.create({
            googleId: profile.id,
            name: profile.displayName,
            email: profile.emails[0].value,
            avatar: cloudinaryResult.secure_url,
          });
        }

        // Create Access Token
        const token = jwt.sign(
          {
            id: user._id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
          },
          process.env.JWT_SECRET,
          { expiresIn: "15m" }
        );

        // Create Refresh Token
        const refreshToken = jwt.sign(
          {
            id: user._id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
          },
          process.env.JWT_REFRESH_SECRET,
          { expiresIn: "30d" }
        );

        return done(null, { user, token, refreshToken });
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});
