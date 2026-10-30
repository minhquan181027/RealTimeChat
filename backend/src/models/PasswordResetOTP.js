import mongoose from "mongoose";

const passwordResetOTPSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            unique: true,
        },

        otp: {
            type: String,
            required: true,
        },

        expiresAt: {
            type: Date,
            required: true,
        },

        attempts: {
            type: Number,
            default: 0,
        },

        verifiedAt: {
            type: Date,
            default: null,
        },

        resetTokenHash: {
            type: String,
            default: null,
        },

        resetTokenExpires: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

passwordResetOTPSchema.index(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 }
);

const PasswordResetOTP = mongoose.model(
    "PasswordResetOTP",
    passwordResetOTPSchema
);

export default PasswordResetOTP;