import Game from "../models/game.js";
import cloudinary from "cloudinary";
import { GraphQLUpload } from "graphql-upload";
import { AuthenticationError } from "apollo-server-express";

const resolvers = {
  Upload: GraphQLUpload,

  Query: {
    // ✅ Fetch only games belonging to the logged-in user
    games: async (_, __, { user }) => {
      if (!user) throw new AuthenticationError("Unauthorized");
      return await Game.find({ userId: user.id });
    },

    // ✅ Fetch single game (if it belongs to user)
    game: async (_, { id }, { user }) => {
      if (!user) throw new AuthenticationError("Unauthorized");
      const game = await Game.findOne({ _id: id, userId: user.id });
      if (!game) throw new AuthenticationError("Game not found or unauthorized");
      return game;
    },
  },

  Mutation: {
    // ✅ Add game for the logged-in user
    addGame: async (_, { name, description, image, category, rating }, { user }) => {
      if (!user) throw new AuthenticationError("Unauthorized");
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

    // ✅ Update game if it belongs to user
    updateGame: async (_, { id, rating }, { user }) => {
      if (!user) throw new AuthenticationError("Unauthorized");
      const game = await Game.findOneAndUpdate(
        { _id: id, userId: user.id },
        { rating },
        { new: true }
      );
      if (!game) throw new AuthenticationError("Game not found or unauthorized");
      return game;
    },

    // ✅ Delete game if it belongs to user
    deleteGame: async (_, { id }, { user }) => {
      if (!user) throw new AuthenticationError("Unauthorized");
      const deleted = await Game.findOneAndDelete({ _id: id, userId: user.id });
      if (!deleted) throw new AuthenticationError("Game not found or unauthorized");
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

        return result.secure_url; // ✅ Return uploaded image URL
      } catch (error) {
        throw new Error("Image upload failed: " + error.message);
      }
    }
  }
};

export default resolvers;
