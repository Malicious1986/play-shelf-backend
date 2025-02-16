import Game from "../models/game.js";
import cloudinary from "cloudinary";
import { GraphQLUpload } from "graphql-upload";

const resolvers = {
  Upload: GraphQLUpload,

  Query: {
    games: async () => await Game.find(),
    game: async (_, { id }) => await Game.findById(id),
  },

  Mutation: {
    addGame: async (_, { name, description, rating, image, category }) => {
      try {
        const newGame = new Game({ name, description, rating, image, category });
        return await newGame.save();
      } catch (error) {
        throw new Error(error.message);
      }
    },

    updateGame: async (_, { id, rating }) => {
      try {
        return await Game.findByIdAndUpdate(id, { rating }, { new: true });
      } catch (error) {
        throw new Error(error.message);
      }
    },

    deleteGame: async (_, { id }) => {
      await Game.findByIdAndDelete(id);
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
