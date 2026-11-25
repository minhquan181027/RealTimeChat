import mongoose from "mongoose";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import { getIO, invalidateMembers } from "../socket/index.js";
import { areUsersBlocked, findNonFriendIds } from "../middlewares/friendMiddleware.js";

const USER_FIELDS = "_id displayName avatarUrl lastActiveAt";
const PARTICIPANT_FIELDS = `${USER_FIELDS} username`;

const populateOptions = [
    { path: "participants.userId", select: PARTICIPANT_FIELDS },
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
            username: p.userId?.username,
            lastActiveAt: p.userId?.lastActiveAt,
            joinAt: p.joinAt,
            status: p.status || "accepted",
        })),
    };
};

export const createConversation = async (req, res) => {
    try {
        const { type, name, memberIds, avatarUrl } = req.body;
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
            if (await areUsersBlocked(userId, otherId)) {
                return res.status(403).json({ message: "Không thể tạo cuộc trò chuyện với người dùng này." });
            }

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
                group: { name: name.trim(), avatarUrl: avatarUrl || null, createdBy: userId },
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
            participants: { $elemMatch: { userId, status: { $ne: "declined" } } },
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

        const recalledMedia = messages.filter(
            (message) => message.recalledAt && (message.imgURL || message.gifProvider || message.gifId)
        );
        if (recalledMedia.length) {
            await Message.updateMany(
                { _id: { $in: recalledMedia.map((message) => message._id) } },
                { $unset: { imgURL: 1, gifProvider: 1, gifId: 1 } }
            );
            recalledMedia.forEach((message) => {
                delete message.imgURL;
                delete message.gifProvider;
                delete message.gifId;
            });
        }

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

        if (status === "accepted") {
            const existing = await Conversation.findById(conversationId).select("type participants").lean();
            if (existing?.type === "direct") {
                const mine = existing.participants.find(
                    (participant) => participant.userId.toString() === userId.toString()
                );
                const other = existing.participants.find(
                    (participant) => participant.userId.toString() !== userId.toString()
                );
                if (mine?.status === "pending" && other && await areUsersBlocked(userId, other.userId)) {
                    return res.status(403).json({ message: "Không thể chấp nhận cuộc trò chuyện với người dùng này." });
                }
            }
        }

        // Chỉ chuyển được khi đang pending
        const conversation = await Conversation.findOneAndUpdate(
            {
                _id: conversationId,
                participants: { $elemMatch: { userId, status: "pending" } },
            },
            { $set: { "participants.$[me].status": status } },
            { arrayFilters: [{ "me.userId": userId }], returnDocument: "after" }
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

export const addMembers = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { memberIds } = req.body;
        const userId = req.user._id;

        if (!mongoose.isValidObjectId(conversationId)) {
            return res.status(400).json({ message: "conversationId không hợp lệ" });
        }
        if (!Array.isArray(memberIds) || memberIds.length === 0 || !memberIds.every((id) => mongoose.isValidObjectId(id))) {
            return res.status(400).json({ message: "Danh sách thành viên không hợp lệ" });
        }

        const conversation = await Conversation.findById(conversationId);
        if (!conversation || conversation.type !== "group") {
            return res.status(404).json({ message: "Không tìm thấy nhóm" });
        }

        const me = conversation.participants.find((p) => p.userId.toString() === userId.toString());
        if (!me || (me.status || "accepted") !== "accepted") {
            return res.status(403).json({ message: "Bạn không thể thêm thành viên vào nhóm này" });
        }

        // Bỏ trùng và bỏ người đã có trong nhóm
        const existing = new Set(conversation.participants.map((p) => p.userId.toString()));
        const newIds = [...new Set(memberIds.map((id) => id.toString()))].filter((id) => !existing.has(id));
        if (newIds.length === 0) {
            return res.status(400).json({ message: "Những người này đã ở trong nhóm" });
        }

        const newUsers = await User.find({ _id: { $in: newIds } }).select("_id displayName").lean();
        if (newUsers.length !== newIds.length) {
            return res.status(404).json({ message: "Có người dùng không tồn tại" });
        }

        const oldMembers = conversation.participants
            .filter((p) => p.status !== "declined")
            .map((p) => p.userId.toString());

        const nonFriends = await findNonFriendIds(userId, newIds);
        newIds.forEach((id) => {
            conversation.participants.push({
                userId: id,
                status: nonFriends.has(id) ? "pending" : "accepted",
            });
        });

        // Tin nhắn hệ thống
        const names = newUsers.map((u) => u.displayName).join(", ");
        const message = await Message.create({
            conversationId: conversation._id,
            senderId: userId,
            content: `${names} được ${req.user.displayName} thêm vào nhóm`, // dự phòng cho tin cũ
            type: "system",
            meta: {
                action: "members_added",
                actor: req.user.displayName,
                targets: newUsers.map((u) => u.displayName),
            },
        });

        conversation.set({
            lastMessage: {
                _id: message._id.toString(),
                content: message.content,
                meta: message.meta,
                type: "system",
                senderId: userId,
                createdAt: message.createdAt,
            },
            lastMessageAt: message.createdAt,
        });
        await conversation.save();
        invalidateMembers(conversationId)
        await message.populate("senderId", "displayName avatarUrl");

        const io = getIO();
        oldMembers.forEach((id) => io.to(id).emit("new_message", message));
        // Mọi người (cả người mới) tải lại danh sách để cập nhật thành viên
        [...oldMembers, ...newIds].forEach((id) => io.to(id).emit("conversation_new"));

        await conversation.populate(populateOptions);
        return res.status(200).json({ conversation: formatConversation(conversation, userId) });
    } catch (error) {
        console.error("Lỗi addMembers:", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

export const leaveGroup = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { newAdminId } = req.body || {};
        const userId = req.user._id;

        if (!mongoose.isValidObjectId(conversationId)) {
            return res.status(400).json({ message: "conversationId không hợp lệ" });
        }

        const conversation = await Conversation.findById(conversationId);
        if (!conversation || conversation.type !== "group") {
            return res.status(404).json({ message: "Không tìm thấy nhóm" });
        }

        const isMember = conversation.participants.some(
            (p) => p.userId.toString() === userId.toString()
        );
        if (!isMember) {
            return res.status(403).json({ message: "Bạn không ở trong nhóm này" });
        }

        const io = getIO();
        const remaining = conversation.participants.filter(
            (p) => p.userId.toString() !== userId.toString()
        );
        const remainingIds = remaining
            .filter((p) => p.status !== "declined")
            .map((p) => p.userId.toString());
        const isAdminLeaving = conversation.group?.createdBy?.toString() === userId.toString();
        const acceptedSuccessors = remaining.filter((p) => (p.status || "accepted") === "accepted");
        const deputyId = conversation.group?.deputyAdmin?.toString();
        let successorId = null;

        if (isAdminLeaving && acceptedSuccessors.length > 0) {
            let successor = acceptedSuccessors.find((p) => p.userId.toString() === deputyId);
            if (!successor) {
                if (!newAdminId || !mongoose.isValidObjectId(newAdminId)) {
                    return res.status(400).json({ message: "Vui lòng chọn quản trị viên mới trước khi rời nhóm" });
                }
                successor = acceptedSuccessors.find(
                    (p) => p.userId.toString() === newAdminId.toString()
                );
            }
            if (!successor) {
                return res.status(400).json({ message: "Quản trị viên mới phải là thành viên đã tham gia nhóm" });
            }
            successorId = successor.userId;
            conversation.group.createdBy = successorId;
            conversation.group.deputyAdmin = null;
        } else if (!isAdminLeaving && deputyId === userId.toString()) {
            conversation.group.deputyAdmin = null;
        }

        // Không còn thành viên đã tham gia để nhận quyền quản trị.
        if (isAdminLeaving && acceptedSuccessors.length === 0) {
            const affectedIds = conversation.participants
                .filter((p) => p.status !== "declined")
                .map((p) => p.userId.toString());
            await Message.deleteMany({ conversationId: conversation._id });
            await conversation.deleteOne();
            invalidateMembers(conversationId);
            affectedIds.forEach((id) => io.to(id).emit("conversation_removed", { conversationId }));
            return res.sendStatus(204);
        }

        // Không còn ai thì xóa hẳn nhóm
        if (remainingIds.length === 0) {
            await Message.deleteMany({ conversationId: conversation._id });
            await conversation.deleteOne();
            invalidateMembers(conversationId);
            io.to(userId.toString()).emit("conversation_removed", { conversationId });
            return res.sendStatus(204);
        }

        conversation.participants = remaining;
        conversation.seenBy.pull(userId);
        conversation.unreadCounts.delete(userId.toString());

        const successorUser = isAdminLeaving
            ? await User.findById(successorId).select("displayName").lean()
            : null;
        const meta = isAdminLeaving
            ? {
                action: "group_admin_transferred",
                actor: req.user.displayName,
                newAdmin: successorUser?.displayName || "",
            }
            : { action: "member_left", actor: req.user.displayName };

        const message = await Message.create({
            conversationId: conversation._id,
            senderId: userId,
            content: isAdminLeaving
                ? `${req.user.displayName} đã rời nhóm và chuyển quyền quản trị cho ${meta.newAdmin}`
                : `${req.user.displayName} đã rời nhóm`, // dự phòng cho client cũ
            type: "system",
            meta,
        });

        conversation.set({
            lastMessage: {
                _id: message._id.toString(),
                content: message.content,
                type: "system",
                meta: message.meta,
                senderId: userId,
                createdAt: message.createdAt,
            },
            lastMessageAt: message.createdAt,
        });
        await conversation.save();
        await message.populate("senderId", "displayName avatarUrl");

        invalidateMembers(conversationId);

        remainingIds.forEach((id) => {
            io.to(id).emit("new_message", message);
            io.to(id).emit("conversation_new"); // tải lại để cập nhật số thành viên
        });
        io.to(userId.toString()).emit("conversation_removed", { conversationId });

        return res.sendStatus(204);
    } catch (error) {
        console.error("Lỗi leaveGroup:", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

export const removeGroupMember = async (req, res) => {
    try {
        const { conversationId, memberId } = req.params;

        if (!mongoose.isValidObjectId(conversationId) || !mongoose.isValidObjectId(memberId)) {
            return res.status(400).json({ message: "ID cuộc trò chuyện hoặc thành viên không hợp lệ" });
        }

        const conversation = await Conversation.findById(conversationId);
        if (!conversation || conversation.type !== "group") {
            return res.status(404).json({ message: "Không tìm thấy nhóm" });
        }

        const adminId = conversation.group?.createdBy?.toString();
        if (!adminId || adminId !== req.user._id.toString()) {
            return res.status(403).json({ message: "Chỉ quản trị viên mới có thể xóa thành viên" });
        }
        if (memberId === adminId) {
            return res.status(400).json({ message: "Quản trị viên không thể tự xóa mình" });
        }

        const target = conversation.participants.find(
            (p) => p.userId.toString() === memberId && p.status !== "declined"
        );
        if (!target) {
            return res.status(404).json({ message: "Không tìm thấy thành viên trong nhóm" });
        }

        const targetUser = await User.findById(memberId).select("displayName").lean();
        if (!targetUser) {
            return res.status(404).json({ message: "Không tìm thấy thành viên trong nhóm" });
        }

        const message = await Message.create({
            conversationId: conversation._id,
            senderId: req.user._id,
            content: `${targetUser.displayName} bị ${req.user.displayName} xóa khỏi nhóm`,
            type: "system",
            meta: {
                action: "member_removed",
                actor: req.user.displayName,
                target: targetUser.displayName,
            },
        });

        conversation.participants = conversation.participants.filter(
            (p) => p.userId.toString() !== memberId
        );
        if (conversation.group?.deputyAdmin?.toString() === memberId) {
            conversation.group.deputyAdmin = null;
        }
        conversation.seenBy.pull(memberId);
        conversation.unreadCounts.delete(memberId);
        conversation.set({
            lastMessage: {
                _id: message._id.toString(),
                content: message.content,
                type: "system",
                meta: message.meta,
                senderId: req.user._id,
                createdAt: message.createdAt,
            },
            lastMessageAt: message.createdAt,
        });
        await conversation.save();
        invalidateMembers(conversationId);
        await message.populate("senderId", "displayName avatarUrl");

        const io = getIO();
        io.to(memberId).emit("conversation_removed", { conversationId });
        conversation.participants
            .filter((p) => p.status !== "declined")
            .forEach((p) => {
                io.to(p.userId.toString()).emit("new_message", message);
                io.to(p.userId.toString()).emit("conversation_new");
            });

        await conversation.populate(populateOptions);
        return res.status(200).json({ conversation: formatConversation(conversation, req.user._id) });
    } catch (error) {
        console.error("Lỗi xóa thành viên khỏi nhóm:", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

export const setGroupDeputyAdmin = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { memberId } = req.body || {};

        if (!mongoose.isValidObjectId(conversationId)) {
            return res.status(400).json({ message: "conversationId không hợp lệ" });
        }
        if (memberId !== null && !mongoose.isValidObjectId(memberId)) {
            return res.status(400).json({ message: "Thành viên không hợp lệ" });
        }

        const conversation = await Conversation.findById(conversationId);
        if (!conversation || conversation.type !== "group") {
            return res.status(404).json({ message: "Không tìm thấy nhóm" });
        }

        const adminId = conversation.group?.createdBy?.toString();
        if (!adminId || adminId !== req.user._id.toString()) {
            return res.status(403).json({ message: "Chỉ quản trị viên mới có thể chỉ định phó quản trị viên" });
        }

        if (memberId) {
            if (memberId.toString() === adminId) {
                return res.status(400).json({ message: "Quản trị viên không thể tự chỉ định mình" });
            }
            const candidate = conversation.participants.find(
                (p) =>
                    p.userId.toString() === memberId.toString() &&
                    (p.status || "accepted") === "accepted"
            );
            if (!candidate) {
                return res.status(400).json({ message: "Phó quản trị viên phải là thành viên đã tham gia nhóm" });
            }
            conversation.group.deputyAdmin = candidate.userId;
        } else {
            conversation.group.deputyAdmin = null;
        }

        await conversation.save();
        const io = getIO();
        conversation.participants
            .filter((p) => p.status !== "declined")
            .forEach((p) => io.to(p.userId.toString()).emit("conversation_new"));

        await conversation.populate(populateOptions);
        return res.status(200).json({ conversation: formatConversation(conversation, req.user._id) });
    } catch (error) {
        console.error("Lỗi cập nhật phó quản trị viên:", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

export const acceptConversation = (req, res) => setMyStatus(req, res, "accepted");
export const declineConversation = (req, res) => setMyStatus(req, res, "declined");