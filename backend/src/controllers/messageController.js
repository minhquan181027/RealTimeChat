import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import cloudinary from 'cloudinary';
import multer from 'multer';

cloudinary.v2.config();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const updateConversationAfterNewMessage = (conversation, message, senderId) => {
    conversation.set({
        lastMessage: {
            _id: message._id.toString(),
            content: message.content,
            type: message.type, // 🆕 Cập nhật type
            senderId,
            createdAt: message.createdAt,
        },
        lastMessageAt: message.createdAt,
        seenBy: [senderId],
    });

    conversation.participants.forEach((p) => {
        const memberId = p.userId.toString();
        const prev = conversation.unreadCounts.get(memberId) || 0;
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

        // 🆕 Tự động xác định type
        let messageType = "text";
        if (imgURL) messageType = "image";

        const message = await Message.create({
            conversationId: conversation._id,
            senderId,
            content,
            imgURL,
            type: messageType, // 🆕 Truyền type vào
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

        // 🆕 Tự động xác định type
        let messageType = "text";
        if (imgURL) messageType = "image";

        const message = await Message.create({
            conversationId,
            senderId,
            content,
            imgURL,
            type: messageType, // 🆕 Truyền type vào
        });

        updateConversationAfterNewMessage(conversation, message, senderId);
        await conversation.save();

        return res.status(201).json({ message });
    } catch (error) {
        console.error("Lỗi khi gửi tin nhắn nhóm.", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};



export const uploadImage = [
    upload.single('image'), // Tên field phải khớp với frontend
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ message: 'Vui lòng chọn file ảnh.' });
            }

            // Upload buffer lên Cloudinary
            const result = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.v2.uploader.upload_stream(
                    { folder: 'chat_app' }, // Thư mục trên Cloudinary
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                );
                uploadStream.end(req.file.buffer);
            });

            // Trả về URL để frontend lưu vào DB
            res.status(200).json({ url: result.secure_url });
        } catch (error) {
            console.error('Lỗi upload ảnh:', error);
            res.status(500).json({ message: 'Lỗi server khi upload ảnh.' });
        }
    },
];