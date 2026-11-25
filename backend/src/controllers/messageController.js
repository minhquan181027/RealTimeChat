import Conversation from "../models/Conversation.js";
import { areUsersBlocked, findNonFriendIds } from "../middlewares/friendMiddleware.js";
import Message from "../models/Message.js";
import mongoose from "mongoose";
import { randomUUID } from "crypto";
import cloudinary from 'cloudinary';
import multer from 'multer';
import { getIO } from "../socket/index.js";
import { translateForRecipients } from "../services/translateService.js";
import { translateText } from "../services/translateService.js";
import {
    deleteOwnedCloudinaryMedia,
    deleteMessageCloudinaryMedia,
    isOwnedCloudinaryMedia,
} from "../services/cloudinaryMediaService.js";

cloudinary.v2.config();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const audioUpload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
});

const getGifPayload = (gifProvider, gifId, imgURL) => {
    if (gifProvider === undefined && gifId === undefined) return null;

    const normalizedId = typeof gifId === "string" ? gifId.trim() : "";
    if (
        gifProvider !== "giphy" ||
        !/^[\w-]{1,128}$/.test(normalizedId) ||
        imgURL
    ) {
        return false;
    }

    return { gifProvider, gifId: normalizedId };
};

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

    // Người gửi trả lời thì cuộc trò chuyện thành chính thức
    const sender = conversation.participants.find(
        (p) => p.userId.toString() === senderId.toString()
    );
    if (sender && sender.status !== "accepted") sender.status = "accepted";

    conversation.participants.forEach((p) => {
        const memberId = p.userId.toString();
        const prev = conversation.unreadCounts.get(memberId) || 0;
        conversation.unreadCounts.set(memberId, memberId === senderId.toString() ? 0 : prev + 1);
    });
};

const emitNewMessage = (conversation, message) => {
    const io = getIO();
    conversation.participants.forEach((p) => {
        if (p.status === "declined") return;
        io.to(p.userId.toString()).emit("new_message", message);
    });
};

export const sendDirectMessage = async (req, res) => {
    try {
        const { recipientId, content, imgURL, audioURL, audioDuration, gifProvider, gifId } = req.body;
        let { conversationId } = req.body;
        const senderId = req.user._id;
        const gifPayload = getGifPayload(gifProvider, gifId, imgURL);

        if (gifPayload === false) {
            return res.status(400).json({ message: "GIF không hợp lệ" });
        }
        if (audioURL && (
            typeof audioURL !== "string" ||
            !Number.isFinite(audioDuration) ||
            audioDuration < 0 ||
            imgURL ||
            gifPayload ||
            !isOwnedCloudinaryMedia(audioURL, "audio", senderId)
        )) {
            return res.status(400).json({ message: "Thông tin tin nhắn ghi âm không hợp lệ" });
        }
        if (imgURL && !isOwnedCloudinaryMedia(imgURL, "image", senderId)) {
            return res.status(400).json({ message: "Ảnh không hợp lệ" });
        }
        if (!content?.trim() && !imgURL && !audioURL && !gifPayload) {
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
            if (conversation.type === "direct") {
                const otherParticipant = conversation.participants.find(
                    (participant) => participant.userId.toString() !== senderId.toString()
                );
                if (otherParticipant && await areUsersBlocked(senderId, otherParticipant.userId)) {
                    return res.status(403).json({ message: "Không thể gửi tin nhắn cho người dùng này." });
                }
            }
        } else {
            if (!recipientId) {
                return res.status(400).json({ message: "Thiếu recipientId" });
            }
            if (recipientId.toString() === senderId.toString()) {
                return res.status(400).json({ message: "Không thể nhắn tin cho chính mình" });
            }
            if (await areUsersBlocked(senderId, recipientId)) {
                return res.status(403).json({ message: "Không thể gửi tin nhắn cho người dùng này." });
            }

            conversation = await Conversation.findOne({
                type: "direct",
                "participants.userId": { $all: [senderId, recipientId] },
            });

            if (!conversation) {
                const nonFriends = await findNonFriendIds(senderId, [recipientId]);
                conversation = await Conversation.create({
                    type: "direct",
                    participants: [
                        { userId: senderId, status: "accepted" },
                        { userId: recipientId, status: nonFriends.size ? "pending" : "accepted" },
                    ],
                    lastMessageAt: new Date(),
                    unreadCounts: new Map(),
                });
            }
        }


        const messageType = gifPayload ? "gif" : audioURL ? "audio" : imgURL ? "image" : "text";

        const message = await Message.create({
            conversationId: conversation._id,
            senderId,
            content,
            imgURL,
            audioURL,
            audioDuration,
            ...gifPayload,
            type: messageType,
        });

        updateConversationAfterNewMessage(conversation, message, senderId);
        await conversation.save();

        // 🆕 Populate để lấy thông tin người gửi (tên, avatar) gửi xuống FE
        await message.populate("senderId", "displayName avatarUrl");

        emitNewMessage(conversation, message);
        translateForRecipients(conversation, message, req.user);

        return res.status(201).json({ message });
    } catch (error) {
        console.error("Lỗi khi gửi tin nhắn trực tiếp.", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

export const sendGroupMessage = async (req, res) => {
    try {
        const { conversationId, content, imgURL, audioURL, audioDuration, gifProvider, gifId } = req.body;
        const senderId = req.user._id;
        const gifPayload = getGifPayload(gifProvider, gifId, imgURL);

        if (!conversationId) {
            return res.status(400).json({ message: "Thiếu conversationId" });
        }
        if (gifPayload === false) {
            return res.status(400).json({ message: "GIF không hợp lệ" });
        }
        if (audioURL && (
            typeof audioURL !== "string" ||
            !Number.isFinite(audioDuration) ||
            audioDuration < 0 ||
            imgURL ||
            gifPayload ||
            !isOwnedCloudinaryMedia(audioURL, "audio", senderId)
        )) {
            return res.status(400).json({ message: "Thông tin tin nhắn ghi âm không hợp lệ" });
        }
        if (imgURL && !isOwnedCloudinaryMedia(imgURL, "image", senderId)) {
            return res.status(400).json({ message: "Ảnh không hợp lệ" });
        }
        if (!content?.trim() && !imgURL && !audioURL && !gifPayload) {
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
        const messageType = gifPayload ? "gif" : audioURL ? "audio" : imgURL ? "image" : "text";

        const message = await Message.create({
            conversationId,
            senderId,
            content,
            imgURL,
            audioURL,
            audioDuration,
            ...gifPayload,
            type: messageType,
        });

        updateConversationAfterNewMessage(conversation, message, senderId);
        await conversation.save();

        // 🆕 Populate để lấy thông tin người gửi (tên, avatar) gửi xuống FE
        await message.populate("senderId", "displayName avatarUrl");

        emitNewMessage(conversation, message);
        translateForRecipients(conversation, message, req.user);

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
                    {
                        public_id: `chat_app/${req.user._id}/${randomUUID()}`,
                        resource_type: "image",
                    },
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

export const uploadAudio = (req, res) => {
    audioUpload.single("audio")(req, res, async (uploadError) => {
        if (uploadError) {
            const status = uploadError.code === "LIMIT_FILE_SIZE" ? 413 : 400;
            return res.status(status).json({ message: "Không thể tải tệp ghi âm lên" });
        }

        try {
            if (!req.file) {
                return res.status(400).json({ message: "Vui lòng chọn tệp ghi âm." });
            }
            if (!req.file.mimetype.startsWith("audio/")) {
                return res.status(400).json({ message: "Tệp tải lên không phải âm thanh." });
            }

            const result = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.v2.uploader.upload_stream(
                    {
                        public_id: `chat_app/${req.user._id}/audio/${randomUUID()}`,
                        resource_type: "video",
                    },
                    (error, uploaded) => {
                        if (error) reject(error);
                        else resolve(uploaded);
                    }
                );
                uploadStream.end(req.file.buffer);
            });

            return res.status(200).json({ url: result.secure_url });
        } catch (error) {
            console.error("Lỗi upload ghi âm:", error);
            return res.status(500).json({ message: "Lỗi server khi upload ghi âm." });
        }
    });
};

export const cleanupUploadedMedia = async (req, res) => {
    const { url, mediaType } = req.body;
    if (typeof url !== "string" || !["image", "audio"].includes(mediaType)) {
        return res.status(400).json({ message: "Thông tin media không hợp lệ" });
    }

    try {
        const existingMessage = await Message.exists({
            recalledAt: null,
            $or: [{ imgURL: url }, { audioURL: url }],
        });
        if (existingMessage) {
            return res.status(409).json({ message: "Media đang được một tin nhắn sử dụng" });
        }

        const deleted = await deleteOwnedCloudinaryMedia(url, mediaType, req.user._id);
        if (!deleted) {
            return res.status(403).json({ message: "Không thể xóa media này" });
        }
        return res.status(200).json({ deleted: true });
    } catch (error) {
        console.error("Lỗi xóa media Cloudinary:", error);
        return res.status(500).json({ message: "Không thể xóa media trên Cloudinary" });
    }
};

const emitMessageUpdate = (conversation, event, payload) => {
    const io = getIO();
    conversation.participants.forEach((p) => {
        if (p.status === "declined") return;
        io.to(p.userId.toString()).emit(event, payload);
    });
};

export const recallMessage = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.messageId)) {
            return res.status(400).json({ message: "ID tin nhắn không hợp lệ" });
        }
        const message = await Message.findById(req.params.messageId);
        if (!message) return res.status(404).json({ message: "Không tìm thấy tin nhắn" });
        if (message.senderId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Bạn không thể thu hồi tin nhắn này" });
        }
        if (!message.recalledAt) {
            message.recalledAt = new Date();
            message.recalledBy = req.user._id;
            await message.save();
        }

        let mediaCleanupComplete;
        try {
            mediaCleanupComplete = await deleteMessageCloudinaryMedia(message);
        } catch (error) {
            console.error("Lỗi xóa media khi thu hồi tin nhắn:", error);
            return res.status(502).json({ message: "Chưa thể xóa media trên Cloudinary. Hãy thử lại." });
        }

        message.set({ gifProvider: undefined, gifId: undefined });
        if (mediaCleanupComplete) {
            message.set({
                imgURL: undefined,
                audioURL: undefined,
                audioDuration: undefined,
            });
        } else {
            console.warn("Giữ lại tham chiếu media cũ không thuộc thư mục Cloudinary của người gửi.");
        }
        await message.save();

        const conversation = await Conversation.findById(message.conversationId);
        if (conversation) {
            if (conversation.lastMessage?._id?.toString() === message._id.toString()) {
                conversation.lastMessage.content = "";
                await conversation.save();
            }
            emitMessageUpdate(conversation, "message_recalled", {
                conversationId: message.conversationId.toString(),
                messageId: message._id.toString(),
                recalledAt: message.recalledAt,
            });
        }
        return res.status(200).json({ message });
    } catch (error) {
        console.error("Lỗi thu hồi tin nhắn:", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

export const reactToMessage = async (req, res) => {
    try {
        const { emoji } = req.body;
        if (!emoji || typeof emoji !== "string" || emoji.length > 16) {
            return res.status(400).json({ message: "Biểu tượng cảm xúc không hợp lệ" });
        }

        const message = await Message.findById(req.params.messageId);
        if (!message) return res.status(404).json({ message: "Không tìm thấy tin nhắn" });

        const conversation = await Conversation.findById(message.conversationId);
        if (!conversation) return res.status(404).json({ message: "Không tìm thấy cuộc trò chuyện" });
        const isMember = conversation.participants.some(
            (p) => p.userId.toString() === req.user._id.toString() && p.status !== "declined"
        );
        if (!isMember) return res.status(403).json({ message: "Bạn không thuộc cuộc trò chuyện này" });

        const reactions = message.reactions || new Map();
        const previousEmojiIds = reactions.get(emoji) || [];
        const wasSelected = previousEmojiIds.some((id) => id.toString() === req.user._id.toString());
        for (const [key, ids] of reactions.entries()) {
            const filtered = ids.filter((id) => id.toString() !== req.user._id.toString());
            if (filtered.length) reactions.set(key, filtered);
            else reactions.delete(key);
        }

        if (!wasSelected) {
            const current = reactions.get(emoji) || [];
            reactions.set(emoji, [...current, req.user._id]);
        }
        message.reactions = reactions;
        await message.save();

        const serialized = Object.fromEntries(
            [...reactions.entries()].map(([key, ids]) => [key, ids.map((id) => id.toString())])
        );
        emitMessageUpdate(conversation, "message_reaction", {
            conversationId: message.conversationId.toString(),
            messageId: message._id.toString(),
            reactions: serialized,
        });
        return res.status(200).json({ reactions: serialized });
    } catch (error) {
        console.error("Lỗi thả biểu tượng cảm xúc:", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

export const translateMessage = async (req, res) => {
    try {
        const message = await Message.findById(req.params.messageId);
        if (!message || message.type !== "text" || !message.content?.trim()) {
            return res.status(404).json({ message: "Tin nhắn không thể dịch" });
        }

        const conversation = await Conversation.findById(message.conversationId);
        if (!conversation) return res.status(404).json({ message: "Không tìm thấy cuộc trò chuyện" });
        const isMember = conversation.participants.some(
            (p) => p.userId.toString() === req.user._id.toString() && p.status !== "declined"
        );
        if (!isMember) return res.status(403).json({ message: "Bạn không thuộc cuộc trò chuyện này" });

        const lang = req.user.language || "vi";
        let existing = message.translations?.get(lang);
        if (!existing) {
            const result = await translateText(message.content, [lang]);
            existing = result.translations?.[lang];
            if (!existing) return res.status(502).json({ message: "Không thể dịch tin nhắn" });
            message.translations = message.translations || new Map();
            message.translations.set(lang, existing);
            if (result.sourceLang) message.sourceLang = result.sourceLang;
            await message.save();
        }

        return res.status(200).json({
            conversationId: message.conversationId.toString(),
            messageId: message._id.toString(),
            lang,
            text: existing,
            sourceLang: message.sourceLang,
        });
    } catch (error) {
        console.error("Lỗi dịch tin nhắn:", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};