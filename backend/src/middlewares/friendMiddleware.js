import Conversation from "../models/Conversation.js";
import Friend from "../models/Friend.js";

const pair = (a, b) => [a.toString(), b.toString()].sort();

// Trả về Set các id KHÔNG phải bạn của `me`
export const findNonFriendIds = async (me, ids) => {
    const checks = await Promise.all(
        ids.map(async (id) => {
            const [userA, userB] = pair(me, id);
            const isFriend = await Friend.exists({ userA, userB });
            return isFriend ? null : id.toString();
        })
    );
    return new Set(checks.filter(Boolean));
};

export const checkGroupMemberShip = async (req, res, next) => {
    try {
        const { conversationId } = req.body;
        const userId = req.user._id;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ message: "Không tìm thấy cuộc trò chuyện" });
        }

        const me = conversation.participants.find(
            (p) => p.userId.toString() === userId.toString()
        );
        if (!me) {
            return res.status(403).json({ message: "Bạn không ở trong nhóm này" });
        }
        if (me.status === "declined") {
            return res.status(403).json({ message: "Bạn đã xóa cuộc trò chuyện này" });
        }

        req.conversation = conversation;
        next();
    } catch (error) {
        console.error("Lỗi xảy ra khi checkGroupMemberShip", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};