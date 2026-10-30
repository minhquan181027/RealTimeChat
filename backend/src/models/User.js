import mongoose from "mongoose";
import { type } from "os";

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
    avataUrl: {
        type: String,

    },
    avataId: {
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

},
    {
        timestamps: true,
    }
);

const User = mongoose.model("User", userSchema);
export default User;