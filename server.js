import express from "express";
import session from "express-session";
import passport from "passport";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import { ApolloServer } from "apollo-server-express";
import fileUpload from "express-fileupload";
import cloudinary from "cloudinary";
import { graphqlUploadExpress } from "graphql-upload";
import cookieParser from "cookie-parser"; // ✅ For handling cookies
import typeDefs from "./graphql/schema.js";
import resolvers from "./graphql/resolvers.js";
import "./auth.js";
import jwt from "jsonwebtoken";

dotenv.config();

const allowedOrigins = ["http://localhost:5173", "https://play-shelf.vercel.app"];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

const app = express();
app.use(express.json());
app.use(cookieParser()); // ✅ Enable cookies
app.use(cors(corsOptions));
app.use(graphqlUploadExpress());
app.use(fileUpload({ useTempFiles: true }));
app.use(
  session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

// ✅ Google OAuth
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login-failed" }),
  (req, res) => {
    const { token, refreshToken } = req.user;

    // ✅ Set Refresh Token in HTTP-only cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true, // HTTPS only
      sameSite: "None",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      domain: process.env.COOKIE_DOMAIN,
    });

    res.redirect(`${process.env.FRONTEND_URL}/auth-success?token=${token}`);
  }
);

// ✅ Refresh Token Route
app.post("/refresh-token", (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) return res.status(401).json({ message: "No refresh tokenm" });

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // ✅ Create new Access Token
    const newAccessToken = jwt.sign(
      { id: decoded.id, name: decoded.name, email: decoded.email, avatar: user.avatar },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    res.json({ accessToken: newAccessToken });
  } catch (err) {
    res.status(403).json({ message: "Invalid refresh token" });
  }
});

// ✅ Logout Route (Clears Refresh Token)
app.post("/logout", (req, res) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: true,
    sameSite: "Strict",
  });

  // ✅ Respond with success instead of redirecting
  res.status(200).json({ message: "Logged out successfully" });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { dbName: "playshelf" })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

// Configure Cloudinary
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ✅ Apollo Server Setup
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return { user: decoded };
      } catch (err) {
        console.warn("Invalid token");
      }
    }
    return { user: null };
  },
});

async function startServer() {
  await server.start();
  server.applyMiddleware({ app, cors: corsOptions });

  app.listen(process.env.PORT || 5050, () => {
    console.log(`🚀 Server running at http://localhost:${process.env.PORT || 5050}${server.graphqlPath}`);
  });
}

startServer();
