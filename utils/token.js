import { config } from "../config/dotenv.js";
import jwt from "jsonwebtoken";

export const generateTokens = (user) => {
  // Create Access Token
  const token = jwt.sign(
    {
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
    },
    config.jwtSecret,
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
    config.jwtRefreshSecret,
    { expiresIn: "30d" }
  );

  return { token, refreshToken };
};
