import mongoose from "mongoose";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import User from "../models/User.js";

const USER_FIELDS = "_id displayName avatarUrl";

const populateOptions = [
    { path: "participants.userId", select: USER_FIELDS },
    { path: "seenBy", select: USER_FIELDS },
    { path: "lastMessage.senderId", select: USER_FIELDS },
];

// Chuẩn hóa 1 conversation (document hoặc object lean) về cùng một shape
const formatConversation = (conversation) => {
    const c = typeof conversation.toObject === "function"
        ? conversation.toObject({ flattenMaps: true })
        : conversation;

    return {
        ...c,
        // [{ userId: {...}, joinAt }] -> [{ _id, displayName, avataUrl, joinAt }]
        participants: c.participants.map((p) => ({
            _id: p.userId?._id,
            displayName: p.userId?.displayName,
            avataUrl: p.userId?.avataUrl,
            joinAt: p.joinAt,
        })),
    };
};

export const createConversation = async (req, res) => {
    try {
        const { type, name, memberIds } = req.body;
        const userId = req.user._id;

        if (!["direct", "group"].includes(type)) {
            return res.status(400).json({ message: "Loại cuộc trò chuyện không hợp lệ" });
        }
        if (!Array.isArray(memberIds) || memberIds.length === 0) {
            return res.status(400).json({ message: "Danh sách thành viên không được để trống" });
        }
        if (!memberIds.every((id) => mongoose.isValidObjectId(id))) {
            return res.status(400).json({ message: "Có id thành viên không hợp lệ" });
        }

        // Loại trùng, loại chính mình ra khỏi danh sách thành viên gửi lên
        const otherIds = [...new Set(memberIds.map((id) => id.toString()))].filter(
            (id) => id !== userId.toString()
        );

        if (otherIds.length === 0) {
            return res.status(400).json({ message: "Không thể tạo cuộc trò chuyện chỉ với chính mình" });
        }

        // Kiểm tra tất cả thành viên đều tồn tại
        const existingCount = await User.countDocuments({ _id: { $in: otherIds } });
        if (existingCount !== otherIds.length) {
            return res.status(404).json({ message: "Có người dùng không tồn tại" });
        }

        let conversation;

        if (type === "direct") {
            if (otherIds.length !== 1) {
                return res.status(400).json({ message: "Cuộc trò chuyện trực tiếp chỉ có 2 người" });
            }
            const otherId = otherIds[0];

            // Nếu đã có cuộc trò chuyện direct giữa 2 người thì trả về luôn
            conversation = await Conversation.findOne({
                type: "direct",
                participants: { $size: 2 },
                "participants.userId": { $all: [userId, otherId] },
            });

            if (!conversation) {
                conversation = await Conversation.create({
                    type: "direct",
                    participants: [{ userId }, { userId: otherId }],
                    lastMessageAt: new Date(),
                });
            }
        } else {
            if (!name?.trim()) {
                return res.status(400).json({ message: "Tên nhóm không được để trống" });
            }
            if (otherIds.length < 2) {
                return res.status(400).json({ message: "Nhóm cần ít nhất 3 thành viên" });
            }

            conversation = await Conversation.create({
                type: "group",
                participants: [userId.toString(), ...otherIds].map((id) => ({ userId: id })),
                group: { name: name.trim(), createdBy: userId },
                lastMessageAt: new Date(),
            });
        }

        await conversation.populate(populateOptions);

        return res.status(201).json({ conversation: formatConversation(conversation) });
    } catch (error) {
        console.error("Lỗi khi tạo cuộc trò chuyện.", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

export const getConversations = async (req, res) => {
    try {
        const userId = req.user._id;

        const conversations = await Conversation.find({ "participants.userId": userId })
            .sort({ lastMessageAt: -1, updatedAt: -1 })
            .populate(populateOptions)
            .lean();

        return res.status(200).json({
            conversations: conversations.map(formatConversation),
        });
    } catch (error) {
        console.error("Lỗi khi lấy danh sách cuộc trò chuyện.", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

export const getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { limit = 50, cursor } = req.query;
        const userId = req.user._id;

        if (!mongoose.isValidObjectId(conversationId)) {
            return res.status(400).json({ message: "conversationId không hợp lệ" });
        }

        const pageSize = Math.min(Math.max(parseInt(limit) || 50, 1), 100);

        // Chỉ thành viên mới được xem tin nhắn
        const isMember = await Conversation.exists({
            _id: conversationId,
            "participants.userId": userId,
        });
        if (!isMember) {
            return res.status(404).json({ message: "Không tìm thấy cuộc trò chuyện" });
        }

        const query = { conversationId };
        if (cursor) {
            const cursorDate = new Date(cursor);
            if (isNaN(cursorDate.getTime())) {
                return res.status(400).json({ message: "cursor không hợp lệ" });
            }
            query.createdAt = { $lt: cursorDate };
        }

        // Lấy dư 1 tin để biết còn trang tiếp theo hay không
        let messages = await Message.find(query)
            .sort({ createdAt: -1 })
            .limit(pageSize + 1)
            .lean();

        let nextCursor = null;
        if (messages.length > pageSize) {
            messages = messages.slice(0, pageSize);
            nextCursor = messages[pageSize - 1].createdAt;
        }

        // Đảo lại để tin cũ ở trên, tin mới ở dưới
        messages.reverse();

        return res.status(200).json({ messages, nextCursor });
    } catch (error) {
        console.error("Lỗi khi lấy tin nhắn.", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};