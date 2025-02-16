import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import { ApolloServer } from "apollo-server-express";
import fileUpload from "express-fileupload";
import cloudinary from "cloudinary";
import { graphqlUploadExpress } from "graphql-upload";
import typeDefs from "./graphql/schema.js";
import resolvers from "./graphql/resolvers.js";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(graphqlUploadExpress()); // ✅ Enables GraphQL file uploads
app.use(fileUpload({ useTempFiles: true })); // ✅ Enables Express file uploads

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

// Setup Apollo Server for GraphQL
const server = new ApolloServer({
  typeDefs,
  resolvers,
  uploads: false, // ✅ Disable built-in file uploads (use `graphql-upload` instead)
});

async function startServer() {
  await server.start();
  server.applyMiddleware({ app });

  app.listen(process.env.PORT || 5050, () => {
    console.log(`🚀 Server running at http://localhost:${process.env.PORT || 5050}${server.graphqlPath}`);
  });
}

startServer();
