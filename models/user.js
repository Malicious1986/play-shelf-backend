import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  googleId: { type: String, unique: true, sparse: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  name: { type: String, required: true },
  avatar: { type: String },
  shareId: { type: String, unique: true },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
});

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});


export default mongoose.model("User", userSchema);
