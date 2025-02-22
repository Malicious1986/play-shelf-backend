import mongoose from "mongoose";

const gameSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    rating: { 
        type: Number, 
        required: true, 
        min: 0, 
        max: 5 // ✅ Restricts rating to a max of 5
    },
    image: { type: String },
    category: { type: String },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
});

export default mongoose.model("Game", gameSchema);
