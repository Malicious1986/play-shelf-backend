import Game from "../models/game.js";
import User from "../models/user.js";
import { v4 as uuidv4 } from "uuid";
import cloudinary from "cloudinary";
import { GraphQLUpload } from "graphql-upload";
import { AuthenticationError } from "apollo-server-express";

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

    games: async (_, { category, minRating }, { user }) => {
      if (!user) throw new AuthenticationError("Unauthorized");

      const query = { userId: user.id };
      if (category && category !== "All") query.category = category;
      if (minRating !== undefined) query.rating = { $gte: minRating };

      return await Game.find(query);
    },

    // Fetch games via shareable link (No Auth Required)
    sharedGames: async (_, { shareId }) => {
      const user = await User.findOne({ shareId });
      if (!user) throw new Error("Invalid share link");
      return await Game.find({ userId: user._id });
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
        userId: user.id, // 👈 Attach user ID
      });
      return await newGame.save();
    },

    generateShareLink: async (_, __, { user }) => {
      if (!user) throw new AuthenticationError("Unauthorized");

      // Generate a unique share ID if it doesn't exist
      const updatedUser = await User.findByIdAndUpdate(
        user.id,
        { $setOnInsert: { shareId: uuidv4() } },
        { new: true }
      );

      return `${process.env.FRONTEND_URL}/shared/${updatedUser.shareId}`;
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
      return updatedGame;
    },

    // Delete game if it belongs to user
    deleteGame: async (_, { id }, { user }) => {
      if (!user) throw new AuthenticationError("Unauthorized");
      const deleted = await Game.findOneAndDelete({ _id: id, userId: user.id });
      if (!deleted)
        throw new AuthenticationError("Game not found or unauthorized");
      return "Game deleted successfully!";
    },

    uploadImage: async (_, { file }) => {
      try {
        const { createReadStream } = await file;
        const stream = createReadStream();
        // Upload to Cloudinary
        const result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.v2.uploader.upload_stream(
            { folder: "playshelf" },
            (error, result) => {
              if (error) reject(error);
              resolve(result);
            }
          );

          stream.pipe(uploadStream);
        });

        return result.secure_url;
      } catch (error) {
        throw new Error("Image upload failed: " + error.message);
      }
    },
  },
};

export default resolvers;
