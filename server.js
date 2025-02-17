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

const isDevelopment = process.env.NODE_ENV !== "production"; // ✅ Detect development mode
const allowedOrigins = ["http://localhost:5173"]; // ✅ Only allow React frontend in development

const corsOptions = isDevelopment
  ? {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true, // ✅ Allow cookies & authentication headers
    }
  : {}; // ❌ No CORS needed in production

const app = express();
app.use(express.json());

// ✅ Apply CORS only in development
if (isDevelopment) {
  app.use(cors(corsOptions));
}

app.use(graphqlUploadExpress());
app.use(fileUpload({ useTempFiles: true }));

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
  uploads: false, // ✅ Disable built-in file uploads (use `graphql-upload`)
});

async function startServer() {
  await server.start();

  server.applyMiddleware({
    app,
    cors: isDevelopment ? corsOptions : false, // ✅ Apply CORS only in development
  });

  app.listen(process.env.PORT || 5050, () => {
    console.log(`🚀 Server running at http://localhost:${process.env.PORT || 5050}${server.graphqlPath}`);
  });
}

startServer();
