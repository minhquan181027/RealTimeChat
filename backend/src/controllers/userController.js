import User from "../models/User.js";
import Friend from "../models/Friend.js";
import FriendRequest from "../models/FriendRequest.js";
import mongoose from "mongoose";

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const authMe = async (req, res) => {
    try {
        const user = req.user;

        return res.status(200).json({
            user
        })

    } catch (error) {
        console.error('Lỗi khi gọi authMe', error);
        return res.status(500).json({ message: 'Lỗi hệ thống' });
    }
}

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
        const user = await User.findById(id).select("_id displayName avatarUrl bio").lean();
        if (!user) return res.status(404).json({ message: "Người dùng không tồn tại" });
        return res.status(200).json({ user });
    } catch (error) {
        console.error("Lỗi getUserProfile:", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};