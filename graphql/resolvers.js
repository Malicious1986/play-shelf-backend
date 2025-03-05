import Game from "../models/game.js";
import User from "../models/user.js";
import { v4 as uuidv4 } from "uuid";
import cloudinary from "cloudinary";
import { GraphQLUpload } from "graphql-upload";
import { AuthenticationError } from "apollo-server-express";
import { generateTokens } from "../utils/token.js";
import { OpenAI } from "openai";
import { z } from "zod";
import bcrypt from "bcryptjs";
import sharp from "sharp";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/\d/, "Password must contain at least one number")
  .regex(
    /[@$!%*?&]/,
    "Password must contain at least one special character (@$!%*?&)"
  );

const resolvers = {
  Upload: GraphQLUpload,

  Query: {
    // Fetch single game (if it belongs to user)
    game: async (_, { id }, { user }) => {
      if (!user) throw new AuthenticationError("Unauthorized");
      const game = await Game.findOne({ _id: id, userId: user.id });
      if (!game)
        throw new AuthenticationError("Game not found or unauthorized");
      return game;
    },

    games: async (_, { category, minRating, limit, offset }, { user }) => {
      if (!user) throw new AuthenticationError("Unauthorized");

      const userAccounts = await User.find({ email: user.email });
      const userIds = userAccounts.map((u) => u._id);

      const query = { userId: { $in: userIds } };
      if (category && category !== "All") query.category = category;
      if (minRating !== undefined) query.rating = { $gte: minRating };
      const games = await Game.find(query).skip(offset).limit(limit);
      const totalGames = await Game.countDocuments(query);

      return {
        games,
        hasMore: totalGames > offset + games.length,
      };
    },

    // Fetch games via shareable link (No Auth Required)
    sharedGames: async (_, { shareId }) => {
      const user = await User.findOne({ shareId });

      if (!user) {
        throw new Error("Shared games not found.");
      }

      const games = await Game.find({ userId: user._id });

      return {
        username: user.name,
        games,
      };
    },
    recommendedGamesAI: async (_, __, { user }) => {
      if (!user) throw new AuthenticationError("Unauthorized");

      // Fetch the user's games
      const userGames = await Game.find({ userId: user.id });

      if (userGames.length === 0) {
        return []; // If no games, return empty recommendations
      }

      // Prepare game list for AI
      const gameList = userGames.map((game) => game.name).join(", ");
      const categories = [
        ...new Set(userGames.map((game) => game.category)),
      ].join(", ");

      // AI prompt
      const prompt = `The user owns these board games: ${gameList}. 
      They prefer categories: ${categories}. 
      Suggest 5 board games they might enjoy. 
      Format the response as a JSON array with name, description, and category.`;

      // Call AI
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });
      const aiRecommendations = JSON.parse(
        response.choices[0].message.content
      ).suggestions;

      return aiRecommendations;
    },
  },

  Mutation: {
    // Add game for the logged-in user
    addGame: async (_, { addGameInput }, { user }) => {
      if (!user) throw new AuthenticationError("Unauthorized");
      const { name, description, image, category, rating } = addGameInput;
      const newGame = new Game({
        name,
        description,
        image,
        category,
        rating,
        userId: user.id,
      });
      await newGame.save();

      return {
        success: true,
        message: "Game added successfully!",
        game: newGame,
      };
    },

    generateShareLink: async (_, __, { user }) => {
      if (!user) throw new AuthenticationError("Unauthorized");

      // Generate a unique share ID if it doesn't exist
      const updatedUser = await User.findByIdAndUpdate(
        user.id,
        { $setOnInsert: { shareId: uuidv4() } },
        { new: true }
      );

      return {
        success: true,
        message: "Share link generated successfully!",
        shareLink: `${process.env.FRONTEND_URL}/shared/${updatedUser.shareId}`,
      };
    },

    forgotPassword: async (_, { email }) => {
      try {
        const user = await User.findOne({ email });
        if (!user) {
          throw new Error("User with that email does not exist.");
        }

        const token = crypto.randomBytes(32).toString("hex");
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();

        const resetURL = `${process.env.FRONTEND_URL}/reset-password/${token}`;

        const mailOptions = {
          from: "playshelf@resend.dev",
          to: email,
          subject: "Password Reset Request",
          html: `<p>You requested a password reset.</p>
               <p>Click <a href="${resetURL}">here</a> to reset your password.</p>`,
        };

        await resend.emails.send(mailOptions);

        return {
          success: true,
          message: "Password reset email sent.",
        };
      } catch (error) {
        return {
          success: false,
          message: "Server error.",
          error: error.message,
        };
      }
    },

    register: async (_, { name, email, password }, { res }) => {
      const passwordValidation = passwordSchema.safeParse(password);
      if (!passwordValidation.success) {
        throw new Error(passwordValidation.error.errors[0].message);
      }

      let user = await User.findOne({ email });

      if (user && !user.password) {
        user.password = password;
        await user.save();
      } else if (!user) {
        user = new User({ name, email, password });
        await user.save();
      } else {
        throw new Error("Email already registered.");
      }

      const { token, refreshToken } = generateTokens(user);

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        domain: process.env.COOKIE_DOMAIN,
        path: "/",
      });

      return { token, user };
    },

    login: async (_, { email, password }, { res }) => {
      const user = await User.findOne({ email });

      if (!user) throw new Error("User not found.");

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) throw new Error("Invalid credentials.");

      const { token, refreshToken } = generateTokens(user);

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        domain: process.env.COOKIE_DOMAIN,
        path: "/",
      });

      return {
        success: true,
        message: "Login successful.",
        auth: {
          user,
          token,
        },
      };
    },

    // Update game if it belongs to user
    updateGame: async (_, { updateGameInput }, { user }) => {
      if (!user) throw new AuthenticationError("Unauthorized");

      const { id, name, description, image, category, rating } =
        updateGameInput;

      // Build update object dynamically
      const updateFields = {};
      if (name !== undefined) updateFields.name = name;
      if (description !== undefined) updateFields.description = description;
      if (image !== undefined) updateFields.image = image;
      if (category !== undefined) updateFields.category = category;
      if (rating !== undefined) updateFields.rating = rating;

      const updatedGame = await Game.findOneAndUpdate(
        { _id: id, userId: user.id },
        { $set: updateFields },
        { new: true }
      );

      if (!updatedGame)
        throw new UserInputError("Game not found or unauthorized");
      return {
        success: true,
        message: "Game updated successfully!",
        game: updatedGame,
      };
    },

    // Delete game if it belongs to user
    deleteGame: async (_, { id }, { user }) => {
      if (!user) throw new AuthenticationError("Unauthorized");
      const deleted = await Game.findOneAndDelete({ _id: id, userId: user.id });
      if (!deleted)
        throw new AuthenticationError("Game not found or unauthorized");
      return {
        success: true,
        message: "Game deleted successfully!",
        id,
      };
    },

    uploadImage: async (_, { file }, { user }) => {
      if (!user) throw new AuthenticationError("Unauthorized");

      try {
        const { createReadStream } = await file;
        const stream = createReadStream();

        const transformer = sharp()
          .resize({ width: 800, withoutEnlargement: true })
          .webp({ quality: 70 });

        const result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.v2.uploader.upload_stream(
            { folder: "playshelf" },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );

          stream.pipe(transformer).pipe(uploadStream);
        });

        return {
          success: true,
          message: "Image uploaded successfully!",
          url: result.secure_url,
        };
      } catch (error) {
        return {
          success: false,
          message: "Image upload failed.",
          error: error.message,
        };
      }
    },
  },
};

export default resolvers;
