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

        const user = await User.findById(decodedUser.userId)
            .select("-hashedPassword");

        if (!user) {
            return res.status(401).json({
                message: "Người dùng không tồn tại"
            });
        }

        req.user = user;
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