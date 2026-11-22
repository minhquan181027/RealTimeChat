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

    type: {
        type: String,

        enum: ["text", "image", "video", "file", "system"],
        default: "text"
    },
    meta: { type: mongoose.Schema.Types.Mixed },
    translations: { type: Map, of: String },
    sourceLang: { type: String },
},
    {
        timestamps: true
    })

messageSchema.index({ conversationId: 1, createdAt: -1, _id: -1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;