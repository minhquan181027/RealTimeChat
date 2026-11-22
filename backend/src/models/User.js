import mongoose from "mongoose";


const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: function () {
            return !this.googleId;
        },
        unique: true,
        trim: true,
        lowercase: true
    },
    hashedPassword: {
        type: String,
        default: null,
        select: false
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true,
    },

    displayName: {
        type: String,
        required: true,
        trim: true
    },
    avatarUrl: {
        type: String,

    },
    avatarId: {
        type: String,

    },
    bio: {
        type: String,
        maxlength: 500,
    },
    phone: {
        type: String,
        sparse: true
    },
    language: { type: String, enum: ["vi", "en", "ja"], default: "vi" },
    autoTranslate: { type: Boolean, default: true },
    gender: { type: String, enum: ["male", "female", "other"] },
    dateOfBirth: { type: Date },

    lastActiveAt: {
        type: Date,
        default: Date.now,
    },

},
    {
        timestamps: true,
    }
);

const User = mongoose.model("User", userSchema);
export default User;