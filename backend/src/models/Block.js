import mongoose from "mongoose";

const blockSchema = new mongoose.Schema(
    {
        blockedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        blockedUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    { timestamps: true }
);

blockSchema.index({ blockedBy: 1, blockedUser: 1 }, { unique: true });
blockSchema.index({ blockedUser: 1 });

const Block = mongoose.model("Block", blockSchema);

export default Block;
