import User from "../models/User.js";
import Friend from "../models/Friend.js";
import FriendRequest from "../models/FriendRequest.js";
import mongoose from "mongoose";
import bcrypt from "bcrypt";

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const authMe = async (req, res) => {
    try {
        const user = req.user;

        return res.status(200).json({
            user,
            needsSetup: req.needsSetup,
            requiresPassword: req.requiresPassword,
        });

    } catch (error) {
        console.error('Lỗi khi gọi authMe', error);
        return res.status(500).json({ message: 'Lỗi hệ thống' });
    }
}

export const completeProfileSetup = async (req, res) => {
    try {
        if (!req.needsSetup) {
            return res.status(409).json({ message: "Tài khoản đã hoàn tất thiết lập." });
        }

        const { username, displayName, bio, gender, dateOfBirth, password, avatarUrl } = req.body;
        const bad = (message, field) => res.status(400).json({ message, field });
        const normalizedUsername = typeof username === "string" ? username.trim().toLowerCase() : "";
        const normalizedName = typeof displayName === "string" ? displayName.trim() : "";

        if (!/^[a-z0-9._]{3,30}$/.test(normalizedUsername)) {
            return bad("Tên đăng nhập phải có 3-30 ký tự (chữ, số, dấu chấm hoặc gạch dưới).", "username");
        }
        if (!normalizedName || normalizedName.length > 50) {
            return bad("Tên hiển thị phải từ 1 đến 50 ký tự.", "displayName");
        }
        if (typeof bio === "string" && bio.trim().length > 500) {
            return bad("Giới thiệu tối đa 500 ký tự.", "bio");
        }
        if (gender && !["male", "female", "other"].includes(gender)) {
            return bad("Giới tính không hợp lệ.", "gender");
        }
        if (avatarUrl !== undefined && avatarUrl !== "" &&
            (typeof avatarUrl !== "string" || !avatarUrl.startsWith("https://"))) {
            return bad("Ảnh đại diện không hợp lệ.", "avatarUrl");
        }

        let parsedDate;
        if (dateOfBirth) {
            parsedDate = new Date(dateOfBirth);
            if (Number.isNaN(parsedDate.getTime()) || parsedDate > new Date()) {
                return bad("Ngày sinh không hợp lệ.", "dateOfBirth");
            }
        }

        const user = await User.findById(req.user._id).select("+hashedPassword");
        if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng." });

        if (!user.hashedPassword && (typeof password !== "string" || password.length < 6)) {
            return bad("Mật khẩu phải có ít nhất 6 ký tự.", "password");
        }

        const duplicateUsername = await User.findOne({
            username: normalizedUsername,
            _id: { $ne: user._id },
        });
        if (duplicateUsername) {
            return res.status(409).json({
                field: "username",
                message: "Tên đăng nhập đã được sử dụng.",
            });
        }

        user.username = normalizedUsername;
        user.displayName = normalizedName;
        user.bio = typeof bio === "string" ? bio.trim() : "";
        user.gender = gender || undefined;
        user.dateOfBirth = parsedDate;
        if (avatarUrl) user.avatarUrl = avatarUrl;
        if (!user.hashedPassword) user.hashedPassword = await bcrypt.hash(password, 10);
        user.onboardingCompleted = true;
        await user.save();

        const safeUser = user.toObject();
        delete safeUser.hashedPassword;
        return res.status(200).json({ user: safeUser });
    } catch (error) {
        if (error.code === 11000 && error.keyPattern?.username) {
            return res.status(409).json({
                field: "username",
                message: "Tên đăng nhập đã được sử dụng.",
            });
        }
        console.error("Lỗi completeProfileSetup:", error);
        return res.status(500).json({ message: "Lỗi hệ thống." });
    }
};

export const searchUsers = async (req, res) => {
    try {
        const q = (req.query.q || "").trim();
        if (q.length < 2) return res.status(200).json({ users: [] });

        const me = req.user._id;
        const safe = escapeRegex(q);
        const users = await User.find({
            _id: { $ne: me },
            $or: [
                { displayName: new RegExp(safe, "i") },
                { email: new RegExp(`^${safe}`, "i") },
            ],
        })
            .select("_id displayName avatarUrl email")
            .limit(10)
            .lean();

        const ids = users.map((u) => u._id);
        const [friends, requests] = await Promise.all([
            Friend.find({
                $or: [
                    { userA: me, userB: { $in: ids } },
                    { userB: me, userA: { $in: ids } },
                ],
            }).lean(),
            FriendRequest.find({
                $or: [
                    { from: me, to: { $in: ids } },
                    { to: me, from: { $in: ids } },
                ],
            }).lean(),
        ]);

        const meStr = me.toString();
        const friendSet = new Set(
            friends.map((f) => (f.userA.toString() === meStr ? f.userB : f.userA).toString())
        );
        const sentSet = new Set(
            requests.filter((r) => r.from.toString() === meStr).map((r) => r.to.toString())
        );
        const receivedSet = new Set(
            requests.filter((r) => r.to.toString() === meStr).map((r) => r.from.toString())
        );

        const result = users.map((u) => {
            const id = u._id.toString();
            const relation = friendSet.has(id) ? "friend"
                : sentSet.has(id) ? "sent"
                    : receivedSet.has(id) ? "received"
                        : "none";
            return { ...u, relation };
        });

        return res.status(200).json({ users: result });
    } catch (error) {
        console.error("Lỗi searchUsers:", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

export const getUserProfile = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "id không hợp lệ" });
        }
        const user = await User.findById(id).select("_id username displayName avatarUrl bio gender dateOfBirth").lean();
        if (!user) return res.status(404).json({ message: "Người dùng không tồn tại" });
        return res.status(200).json({ user });
    } catch (error) {
        console.error("Lỗi getUserProfile:", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const { displayName, bio, phone, gender, dateOfBirth, avatarUrl, language, autoTranslate } = req.body;
        const $set = {};
        const $unset = {};
        const bad = (message) => res.status(400).json({ message });

        if (displayName !== undefined) {
            const name = String(displayName).trim();
            if (!name || name.length > 50) return bad("Tên hiển thị phải từ 1 đến 50 ký tự");
            $set.displayName = name;
        }

        if (bio !== undefined) {
            const b = String(bio).trim();
            if (b.length > 500) return bad("Giới thiệu tối đa 500 ký tự");
            if (b) $set.bio = b; else $unset.bio = 1;
        }

        if (phone !== undefined) {
            const p = String(phone).trim();
            if (p && !/^\+?[0-9\s]{8,15}$/.test(p)) return bad("Số điện thoại không hợp lệ");
            if (p) $set.phone = p; else $unset.phone = 1;
        }

        if (gender !== undefined) {
            if (gender && !["male", "female", "other"].includes(gender)) return bad("Giới tính không hợp lệ");
            if (gender) $set.gender = gender; else $unset.gender = 1;
        }

        if (dateOfBirth !== undefined) {
            if (dateOfBirth) {
                const d = new Date(dateOfBirth);
                if (isNaN(d.getTime()) || d > new Date()) return bad("Ngày sinh không hợp lệ");
                $set.dateOfBirth = d;
            } else {
                $unset.dateOfBirth = 1;
            }
        }

        if (avatarUrl !== undefined) {
            if (typeof avatarUrl !== "string" || !avatarUrl.startsWith("https://")) {
                return bad("Ảnh đại diện không hợp lệ");
            }
            $set.avatarUrl = avatarUrl;
        }
        if (language !== undefined) {
            if (!["vi", "en", "ja"].includes(language)) return bad("Ngôn ngữ không hợp lệ");
            $set.language = language;
        }

        if (autoTranslate !== undefined) {
            if (typeof autoTranslate !== "boolean") return bad("Giá trị không hợp lệ");
            $set.autoTranslate = autoTranslate;
        }

        const update = {};
        if (Object.keys($set).length) update.$set = $set;
        if (Object.keys($unset).length) update.$unset = $unset;
        if (!Object.keys(update).length) return bad("Không có gì để cập nhật");

        const user = await User.findByIdAndUpdate(req.user._id, update, { returnDocument: "after" })
            .select("-hashedPassword")
            .lean();

        return res.status(200).json({ user });
    } catch (error) {
        console.error("Lỗi updateProfile:", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};