import jwt from 'jsonwebtoken'
import User from '../models/User.js'

export const protectedRoute = async (req, res, next) => {
    try {
        const authHeader = req.headers["authorization"];
        const token = authHeader?.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                message: "Không tìm thấy access token"
            });
        }

        const decodedUser = jwt.verify(
            token,
            process.env.ACCESS_TOKEN_SECRET
        );

        const userDocument = await User.findById(decodedUser.userId)
            .select("+hashedPassword");

        if (!userDocument) {
            return res.status(401).json({
                message: "Người dùng không tồn tại"
            });
        }

        req.needsSetup = !userDocument.onboardingCompleted || !userDocument.hashedPassword;
        req.requiresPassword = !userDocument.hashedPassword;
        req.user = userDocument.toObject();
        delete req.user.hashedPassword;
        next();

    } catch (error) {
        if (
            error.name === "TokenExpiredError" ||
            error.name === "JsonWebTokenError" ||
            error.name === "NotBeforeError"
        ) {
            return res.status(401).json({
                message: "Access token không hợp lệ hoặc đã hết hạn"
            });
        }

        console.error(error);

        return res.status(500).json({
            message: "Lỗi máy chủ"
        });
    }
};

export const requireSetupComplete = (req, res, next) => {
    const isProfileImageUpload = req.method === "POST" && req.path === "/api/message/upload";
    if (req.needsSetup && !isProfileImageUpload) {
        return res.status(403).json({
            code: "SETUP_REQUIRED",
            message: "Vui lòng hoàn tất thiết lập tài khoản trước khi tiếp tục."
        });
    }
    next();
};