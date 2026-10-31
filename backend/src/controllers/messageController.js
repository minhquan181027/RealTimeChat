import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";

// Cập nhật lastMessage, lastMessageAt, seenBy và unreadCounts sau khi có tin nhắn mới
const updateConversationAfterNewMessage = (conversation, message, senderId) => {
    conversation.set({
        lastMessage: {
            _id: message._id.toString(),
            content: message.content,
            senderId,
            createdAt: message.createdAt,
        },
        lastMessageAt: message.createdAt,
        seenBy: [senderId], // người gửi coi như đã xem
    });

    conversation.participants.forEach((p) => {
        const memberId = p.userId.toString();
        const prev = conversation.unreadCounts.get(memberId) || 0;
        // người gửi = 0, người khác +1
        conversation.unreadCounts.set(memberId, memberId === senderId.toString() ? 0 : prev + 1);
    });
};

export const sendDirectMessage = async (req, res) => {
    try {
        const { recipientId, content, imgURL } = req.body;
        let { conversationId } = req.body;
        const senderId = req.user._id;

        if (!content?.trim() && !imgURL) {
            return res.status(400).json({ message: "Thiếu nội dung tin nhắn" });
        }

        let conversation;

        if (conversationId) {
            conversation = await Conversation.findById(conversationId);
            if (!conversation) {
                return res.status(404).json({ message: "Không tìm thấy cuộc trò chuyện" });
            }
            const isMember = conversation.participants.some(
                (p) => p.userId.toString() === senderId.toString()
            );
            if (!isMember) {
                return res.status(403).json({ message: "Bạn không thuộc cuộc trò chuyện này" });
            }
        } else {
            if (!recipientId) {
                return res.status(400).json({ message: "Thiếu recipientId" });
            }
            if (recipientId.toString() === senderId.toString()) {
                return res.status(400).json({ message: "Không thể nhắn tin cho chính mình" });
            }

            // Tìm cuộc trò chuyện direct đã có giữa 2 người
            conversation = await Conversation.findOne({
                type: "direct",
                "participants.userId": { $all: [senderId, recipientId] },
            });

            if (!conversation) {
                conversation = await Conversation.create({
                    type: "direct",
                    participants: [{ userId: senderId }, { userId: recipientId }],
                    lastMessageAt: new Date(),
                    unreadCounts: new Map(),
                });
            }
        }

        const message = await Message.create({
            conversationId: conversation._id,
            senderId,
            content,
            imgURL,
        });

        updateConversationAfterNewMessage(conversation, message, senderId);
        await conversation.save();

        return res.status(201).json({ message });
    } catch (error) {
        console.error("Lỗi khi gửi tin nhắn trực tiếp.", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

export const sendGroupMessage = async (req, res) => {
    try {
        const { conversationId, content, imgURL } = req.body;
        const senderId = req.user._id;

        if (!conversationId) {
            return res.status(400).json({ message: "Thiếu conversationId" });
        }
        if (!content?.trim() && !imgURL) {
            return res.status(400).json({ message: "Thiếu nội dung tin nhắn" });
        }

        const conversation = await Conversation.findById(conversationId);
        if (!conversation || conversation.type !== "group") {
            return res.status(404).json({ message: "Không tìm thấy nhóm chat" });
        }

        const isMember = conversation.participants.some(
            (p) => p.userId.toString() === senderId.toString()
        );
        if (!isMember) {
            return res.status(403).json({ message: "Bạn không thuộc nhóm này" });
        }

        const message = await Message.create({
            conversationId,
            senderId,
            content,
            imgURL,
        });

        updateConversationAfterNewMessage(conversation, message, senderId);
        await conversation.save();

        return res.status(201).json({ message });
    } catch (error) {
        console.error("Lỗi khi gửi tin nhắn nhóm.", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};