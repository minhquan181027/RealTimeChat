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