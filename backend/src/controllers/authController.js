import bcrypt from 'bcrypt'
import User from '../models/User.js'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import Session from '../models/Session.js';

const REFRESH_TOKEN_TTL = 14 * 24 * 60 * 60 * 1000;

export const signUp = async (req, res) => {
    try {
        const { username, password, email, firstName, lastName } = req.body;
        if (!username || !password || !email || !firstName || !lastName) {
            return res.status(400).json({ message: "Không thể thiếu username,password,...." })
        }
        const duplicateUsername = await User.findOne({ username });
        if (duplicateUsername) {
            return res.status(409).json({
                field: "username",
                message: "Username đã được sử dụng"
            });
        }
        const duplicateEmail = await User.findOne({ email });
        if (duplicateEmail) {
            return res.status(409).json({
                field: "email",
                message: "Email đã được sử dụng"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await User.create({
            username,
            hashedPassword,
            email,
            displayName: `${firstName} ${lastName}`

        });
        return res.sendStatus(204);


    } catch (error) {
        console.error('Lỗi khi gọi signUp');
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
}
export const signIn = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(409).json({ message: "Vui lòng nhập email và password" });

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: "Email hoặc mật khẩu chưa chính xác" });
        }

        const passCorrect = await bcrypt.compare(password, user.hashedPassword);
        if (!passCorrect) return res.status(401).json({ message: "mật khẩu chưa chính xác" });

        // Tạo accessToken với JWT
        const accessToken = jwt.sign(
            { userId: user._id },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '5s' }
        );

        // Tạo refresh token 
        const refreshToken = crypto.randomBytes(64).toString("hex");

        //Tạo session mới để lưu refresh token
        await Session.create({
            userId: user._id,
            refreshToken,
            expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL),
        })

        //trả refresh token về trong cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: REFRESH_TOKEN_TTL
        });

        return res.status(200).json({ message: `User ${user.displayName} đã login thành công`, accessToken });

    } catch (error) {
        console.error("Lỗi signIn:", error);

        return res.status(500).json({
            message: "Lỗi hệ thống"
        });
    }
}
export const signOut = async (req, res) => {
    try {
        // lấy refreshtoken từ cookie
        const token = req.cookies?.refreshToken;
        if (token) {
            // xóa refresh token trong session
            await Session.deleteOne({ refreshToken: token });
            // xóa trong cookie
            res.clearCookie("refreshToken");
        }
        return res.sendStatus(204);


    } catch (error) {
        console.error("Lỗi signout:", error);

        return res.status(500).json({
            message: "Lỗi hệ thống"
        });
    }
}
// tạo accesstoken mới từ refresh token
export const refreshToken = async (req, res) => {
    try {
        // Lấy refreshtoken từ cookie
        const token = req.cookies?.refreshToken;
        if (!token) {
            return res.status(401).json({ message: "Token không tồn tại" });

        }
        const session = await Session.findOne({ refreshToken: token });

        if (!session) {
            return res.status(403).json({ message: "Token không hợp lệ hoặc đã hết hạn" });
        }
        if (session.expiresAt < new Date()) {
            return res.status(403).json({ message: "Token đã hết hạn" });
        }
        const accessToken = jwt.sign(
            { userId: session.userId },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '1h' }
        );
        return res.json({ accessToken });
    } catch (error) {
        console.error("Lỗi refreshtoken:", error);

        return res.status(500).json({
            message: "Lỗi hệ thống"
        });
    }
}