import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/user.js";
import cloudinary from "./cloudinary.js";
import { config } from "./dotenv.js";
import { generateTokens } from "../utils/token.js";

passport.use(
  new GoogleStrategy(
    {
      clientID: config.googleClientId,
      clientSecret: config.googleClientSecret,
      callbackURL: `${config.callbackUrl}/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ email: profile.emails[0].value });

        if (!user) {
          const cloudinaryResult = await cloudinary.v2.uploader.upload(
            profile.photos[0].value,
            {
              folder: "user_avatars",
              public_id: `google_${profile.id}`,
              overwrite: true,
            }
          );

          user = await User.create({
            googleId: profile.id,
            name: profile.displayName,
            email: profile.emails[0].value,
            avatar: cloudinaryResult.secure_url,
          });
        } else if (!user.googleId) {
          user.googleId = profile.id;
          await user.save();
        }

        const { token, refreshToken } = generateTokens(user);

        return done(null, { user, token, refreshToken });
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));
