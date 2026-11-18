import User from "../models/User.js";

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

        const safe = escapeRegex(q);
        const users = await User.find({
            _id: { $ne: req.user._id },
            $or: [
                { displayName: new RegExp(safe, "i") },   // tên: khớp bất kỳ đâu
                { email: new RegExp(`^${safe}`, "i") },   // email: khớp từ đầu
            ],
        })
            .select("_id displayName avatarUrl email")
            .limit(10)
            .lean();

        return res.status(200).json({ users });
    } catch (error) {
        console.error("Lỗi searchUsers:", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};