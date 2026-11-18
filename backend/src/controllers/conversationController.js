import mongoose from "mongoose";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import { getIO } from "../socket/index.js";
import { findNonFriendIds } from "../middlewares/friendMiddleware.js";

const USER_FIELDS = "_id displayName avatarUrl lastActiveAt";

const populateOptions = [
    { path: "participants.userId", select: USER_FIELDS },
    { path: "seenBy", select: USER_FIELDS },
    { path: "lastMessage.senderId", select: USER_FIELDS },
];



const formatConversation = (conversation, userId) => {
    const c = typeof conversation.toObject === "function"
        ? conversation.toObject({ flattenMaps: true })
        : conversation;

    const mine = c.participants.find(
        (p) => (p.userId?._id ?? p.userId)?.toString() === userId?.toString()
    );

    return {
        ...c,
        myStatus: mine?.status || "accepted",
        seenBy: (c.seenBy || []).map((u) => u._id ? u._id.toString() : u.toString()),
        participants: c.participants.map((p) => ({
            _id: p.userId?._id,
            displayName: p.userId?.displayName,
            avatarUrl: p.userId?.avatarUrl,
            lastActiveAt: p.userId?.lastActiveAt,
            joinAt: p.joinAt,
            status: p.status || "accepted",
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
                const nonFriends = await findNonFriendIds(userId, [otherId]);
                conversation = await Conversation.create({
                    type: "direct",
                    participants: [
                        { userId, status: "accepted" },
                        { userId: otherId, status: nonFriends.size ? "pending" : "accepted" },
                    ],
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

            // group (sau kiểm tra otherIds.length < 2)
            const nonFriends = await findNonFriendIds(userId, otherIds);
            conversation = await Conversation.create({
                type: "group",
                participants: [
                    { userId, status: "accepted" },
                    ...otherIds.map((id) => ({
                        userId: id,
                        status: nonFriends.has(id) ? "pending" : "accepted",
                    })),
                ],
                group: { name: name.trim(), createdBy: userId },
                lastMessageAt: new Date(),
            });

            // báo realtime cho các thành viên khác
            const io = getIO();
            otherIds.forEach((id) => io.to(id).emit("conversation_new"));
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

        const conversations = await Conversation.find({
            participants: { $elemMatch: { userId, status: { $ne: "declined" } } },
        })
            .sort({ lastMessageAt: -1, updatedAt: -1 })
            .populate(populateOptions)
            .lean();

        return res.status(200).json({
            conversations: conversations.map((c) => formatConversation(c, userId)),
        });
    } catch (error) {
        console.error("❌ Lỗi getConversations:", error);
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

        // ---- Cursor composite: "<createdAtISO>|<_id>" (base64) ----
        if (cursor) {
            let cursorDate, cursorId;
            try {
                const decoded = Buffer.from(cursor, "base64").toString("utf8");
                const [dateStr, id] = decoded.split("|");
                cursorDate = new Date(dateStr);
                cursorId = id;
            } catch {
                return res.status(400).json({ message: "cursor không hợp lệ" });
            }

            if (
                !cursorDate ||
                isNaN(cursorDate.getTime()) ||
                !mongoose.isValidObjectId(cursorId)
            ) {
                return res.status(400).json({ message: "cursor không hợp lệ" });
            }

            // Lấy tin cũ hơn: createdAt < cursorDate
            // HOẶC createdAt == cursorDate nhưng _id < cursorId (tránh trùng/mất khi trùng timestamp)
            query.$or = [
                { createdAt: { $lt: cursorDate } },
                { createdAt: cursorDate, _id: { $lt: cursorId } },
            ];
        }

        // Lấy dư 1 tin để biết còn trang tiếp theo hay không
        let messages = await Message.find(query)
            .sort({ createdAt: -1, _id: -1 })
            .limit(pageSize + 1)
            .populate("senderId", "displayName avatarUrl")
            .lean();

        let nextCursor = null;
        if (messages.length > pageSize) {
            messages = messages.slice(0, pageSize);
            const last = messages[pageSize - 1];
            nextCursor = Buffer.from(
                `${last.createdAt.toISOString()}|${last._id.toString()}`
            ).toString("base64");
        }

        // Đảo lại để tin cũ ở trên, tin mới ở dưới
        messages.reverse();

        return res.status(200).json({ messages, nextCursor });
    } catch (error) {
        console.error("Lỗi khi lấy tin nhắn.", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};


export const markAsRead = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user._id;

        if (!mongoose.isValidObjectId(conversationId)) {
            return res.status(400).json({ message: "conversationId không hợp lệ" });
        }

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ message: "Không tìm thấy cuộc trò chuyện" });
        }

        const me = conversation.participants.find(
            (p) => p.userId.toString() === userId.toString()
        );
        if (!me) {
            return res.status(403).json({ message: "Bạn không thuộc cuộc trò chuyện này" });
        }
        // Chưa chấp nhận thì không đánh dấu đã xem
        if ((me.status || "accepted") !== "accepted") {
            return res.status(200).json({ message: "Chưa chấp nhận, bỏ qua" });
        }

        const currentUnread = conversation.unreadCounts || new Map();
        currentUnread.set(userId.toString(), 0);
        conversation.unreadCounts = currentUnread;
        conversation.seenBy.addToSet(userId);
        await conversation.save();

        const io = getIO();
        const seenByStrings = conversation.seenBy.map((id) => id.toString());
        conversation.participants.forEach((p) => {
            if (p.status === "declined") return;
            io.to(p.userId.toString()).emit("conversation_seen", {
                conversationId,
                seenBy: seenByStrings,
            });
        });

        return res.status(200).json({ message: "Đã đánh dấu đã đọc" });
    } catch (error) {
        console.error("Lỗi markAsRead:", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

const setMyStatus = async (req, res, status) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user._id;

        if (!mongoose.isValidObjectId(conversationId)) {
            return res.status(400).json({ message: "conversationId không hợp lệ" });
        }

        // Chỉ chuyển được khi đang pending
        const conversation = await Conversation.findOneAndUpdate(
            {
                _id: conversationId,
                participants: { $elemMatch: { userId, status: "pending" } },
            },
            { $set: { "participants.$[me].status": status } },
            { arrayFilters: [{ "me.userId": userId }], new: true }
        );

        if (!conversation) {
            return res.status(404).json({ message: "Không có cuộc trò chuyện đang chờ" });
        }

        // Đồng bộ các tab/thiết bị khác của mình
        getIO().to(userId.toString()).emit("conversation_status", { conversationId, status });

        return res.status(200).json({ status });
    } catch (error) {
        console.error("Lỗi setMyStatus:", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

export const acceptConversation = (req, res) => setMyStatus(req, res, "accepted");
export const declineConversation = (req, res) => setMyStatus(req, res, "declined");