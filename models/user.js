import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  googleId: { type: String, required: true, unique: true },
  name: String,
  email: String,
  avatar: String,
  shareId: { type: String, unique: true, sparse: true },
});

export default mongoose.model("User", userSchema);
