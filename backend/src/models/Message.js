import mongoose from "mongoose"

const messageSchema = new mongoose.Schema({
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Conversation",
        required: true,
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    content: {
        type: String,
        trim: true
    },
    imgURL: {
        type: String,
    },
    audioURL: {
        type: String,
    },
    audioDuration: {
        type: Number,
        min: 0,
    },
    gifProvider: {
        type: String,
        enum: ["giphy"],
    },
    gifId: {
        type: String,
        trim: true,
        maxlength: 128,
    },

    type: {
        type: String,

        enum: ["text", "image", "audio", "gif", "video", "file", "system"],
        default: "text"
    },
    meta: { type: mongoose.Schema.Types.Mixed },
    translations: { type: Map, of: String },
    sourceLang: { type: String },
    reactions: {
        type: Map,
        of: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        default: {},
    },
    recalledAt: { type: Date, default: null },
    recalledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
},
    {
        timestamps: true
    })

messageSchema.index({ conversationId: 1, createdAt: -1, _id: -1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;