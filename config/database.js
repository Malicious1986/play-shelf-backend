import mongoose from "mongoose";
import { config } from "./dotenv.js";

export async function connectDB() {
  try {
    await mongoose.connect(config.mongoUri, { dbName: "playshelf" });
    console.log("✅ MongoDB Connected");
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error);
    process.exit(1);
  }
}
