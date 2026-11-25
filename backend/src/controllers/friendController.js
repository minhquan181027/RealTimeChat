import Friend from "../models/Friend.js";
import User from "../models/User.js";
import FriendRequest from "../models/FriendRequest.js";
import Conversation from "../models/Conversation.js";
import { getIO } from "../socket/index.js";
import Block from "../models/Block.js";
import mongoose from "mongoose";
import { areUsersBlocked } from "../middlewares/friendMiddleware.js";

export const sendFriendRequest = async (req, res) => {
    try {
        const { to, message } = req.body;
        const from = req.user._id;

        if (from.toString() === to.toString()) {
            return res.status(400).json({
                message: "Không thể gửi lời mời kết bạn cho chính mình"
            });
        }

        const userExists = await User.exists({ _id: to });
        if (!userExists) return res.status(404).json({ message: "Người dùng không tồn tại" });
        if (await areUsersBlocked(from, to)) {
            return res.status(403).json({ message: "Không thể gửi lời mời kết bạn cho người dùng này." });
        }

        let userA = from.toString();
        let userB = to.toString();

        if (userA > userB) [userA, userB] = [userB, userA];

        const [alreadyFriends, existingRequest] = await Promise.all([
            Friend.findOne({ userA, userB }),
            FriendRequest.findOne({
                $or: [
                    { from, to },
                    { from: to, to: from }
                ]
            })
        ]);
        if (alreadyFriends) return res.status(400).json({ message: "hai người đã là bạn bè" });
        if (existingRequest) return res.status(400).json({ message: "Đã có lời mời đang chờ" });

        const request = await FriendRequest.create({
            from, to, message
        });
        getIO().to(to.toString()).emit("friend_request_new");

        return res.status(200).json({ message: "Gửi lời mời kết bạn thành công" });
    } catch (error) {
        console.error("Lỗi khi gửi yêu cầu kết bạn.", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
}

export const acceptFriendRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const userId = req.user._id;

        const request = await FriendRequest.findById(requestId);

        if (!request) {
            return res.status(404).json({ message: "Không tìm thấy lời mời kết bạn" });
        }

        // Chỉ người nhận mới được chấp nhận
        if (request.to.toString() !== userId.toString()) {
            return res.status(403).json({ message: "Bạn không có quyền chấp nhận lời mời này" });
        }
        if (await areUsersBlocked(request.from, request.to)) {
            await FriendRequest.findByIdAndDelete(requestId);
            return res.status(403).json({ message: "Không thể chấp nhận lời mời do có chặn người dùng." });
        }

        // pre('save') trong Friend sẽ tự sắp xếp userA < userB
        const friend = await Friend.create({
            userA: request.from,
            userB: request.to,
        });

        await FriendRequest.findByIdAndDelete(requestId);

        await Conversation.updateMany(
            {
                type: "direct",
                participants: { $size: 2 },
                "participants.userId": { $all: [request.from, request.to] },
            },
            { $set: { "participants.$[p].status": "accepted" } },
            { arrayFilters: [{ "p.status": "pending" }] }
        );

        const io = getIO();
        io.to(request.from.toString()).emit("friend_accepted");
        io.to(request.from.toString()).emit("conversation_new");
        io.to(request.to.toString()).emit("conversation_new");

        const from = await User.findById(request.from)
            .select("_id displayName avatarUrl")
            .lean();

        return res.status(200).json({
            message: "Chấp nhận lời mời kết bạn thành công",
            newFriend: {
                _id: from?._id,
                displayName: from?.displayName,
                avatarUrl: from?.avatarUrl,
            },
        });
    } catch (error) {
        console.error("Lỗi khi chấp nhận lời mời kết bạn.", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

export const declineFriendRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const userId = req.user._id;

        const request = await FriendRequest.findById(requestId);
        if (!request) {
            return res.status(404).json({ message: "Không tìm thấy lời mời kết bạn" });
        }

        if (request.to.toString() !== userId.toString()) {
            return res.status(403).json({ message: "Bạn không có quyền từ chối lời mời này" });
        }
        const isReceiver = request.to.toString() === userId.toString();
        const isSender = request.from.toString() === userId.toString();
        if (!isReceiver && !isSender) {
            return res.status(403).json({ message: "Bạn không có quyền với lời mời này" });
        }

        await FriendRequest.findByIdAndDelete(requestId);

        return res.sendStatus(204);
    } catch (error) {
        console.error("Lỗi khi từ chối lời mời kết bạn.", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

export const getAllFriends = async (req, res) => {
    try {
        const userId = req.user._id;

        const friendships = await Friend.find({
            $or: [{ userA: userId }, { userB: userId }],
        })
            .populate("userA", "_id displayName avatarUrl")
            .populate("userB", "_id displayName avatarUrl")
            .lean();

        if (!friendships.length) {
            return res.status(200).json({ friends: [] });
        }

        // Lấy ra người còn lại trong mỗi cặp
        const friends = friendships.map((f) =>
            f.userA._id.toString() === userId.toString() ? f.userB : f.userA
        );

        return res.status(200).json({ friends });
    } catch (error) {
        console.error("Lỗi khi lấy danh sách bạn bè.", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

export const getFriendRequests = async (req, res) => {
    try {
        const userId = req.user._id;
        const populateFields = "_id username displayName avatarUrl";

        const [received, sent] = await Promise.all([
            FriendRequest.find({ to: userId }).populate("from", populateFields).lean(),
            FriendRequest.find({ from: userId }).populate("to", populateFields).lean(),
        ]);

        return res.status(200).json({ received, sent });
    } catch (error) {
        console.error("Lỗi khi lấy danh sách yêu cầu kết bạn.", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

export const removeFriend = async (req, res) => {
    try {
        const { friendId } = req.params;
        const userId = req.user._id;

        let userA = userId.toString();
        let userB = friendId.toString();
        if (userA > userB) [userA, userB] = [userB, userA];

        const deleted = await Friend.findOneAndDelete({ userA, userB });
        if (!deleted) {
            return res.status(404).json({ message: "Hai người chưa là bạn bè" });
        }

        // Báo cho người kia cập nhật danh sách bạn
        getIO().to(friendId.toString()).emit("friend_removed", { userId: userId.toString() });

        return res.sendStatus(204);
    } catch (error) {
        console.error("Lỗi khi xóa bạn bè.", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

export const getBlockStatus = async (req, res) => {
    try {
        const { userId: targetId } = req.params;
        const userId = req.user._id;
        if (!mongoose.isValidObjectId(targetId)) {
            return res.status(400).json({ message: "ID người dùng không hợp lệ." });
        }
        if (targetId === userId.toString()) {
            return res.status(400).json({ message: "Không thể kiểm tra trạng thái chặn của chính mình." });
        }

        const [blockedByMe, blockedMe] = await Promise.all([
            Block.exists({ blockedBy: userId, blockedUser: targetId }),
            Block.exists({ blockedBy: targetId, blockedUser: userId }),
        ]);
        return res.status(200).json({ blockedByMe: !!blockedByMe, blockedMe: !!blockedMe });
    } catch (error) {
        console.error("Lỗi khi lấy trạng thái chặn:", error);
        return res.status(500).json({ message: "Lỗi hệ thống." });
    }
};

export const blockUser = async (req, res) => {
    try {
        const { userId: targetId } = req.params;
        const userId = req.user._id;
        if (!mongoose.isValidObjectId(targetId)) {
            return res.status(400).json({ message: "ID người dùng không hợp lệ." });
        }
        if (targetId === userId.toString()) {
            return res.status(400).json({ message: "Không thể chặn chính mình." });
        }
        if (!(await User.exists({ _id: targetId }))) {
            return res.status(404).json({ message: "Người dùng không tồn tại." });
        }

        try {
            await Block.create({ blockedBy: userId, blockedUser: targetId });
        } catch (error) {
            if (error.code !== 11000) throw error;
        }

        let userA = userId.toString();
        let userB = targetId;
        if (userA > userB) [userA, userB] = [userB, userA];
        await Promise.all([
            Friend.findOneAndDelete({ userA, userB }),
            FriendRequest.deleteMany({
                $or: [
                    { from: userId, to: targetId },
                    { from: targetId, to: userId },
                ],
            }),
        ]);

        const io = getIO();
        io.to(userId.toString()).emit("friend_removed", { userId: targetId });
        io.to(targetId).emit("friend_removed", { userId: userId.toString() });
        io.to(userId.toString()).emit("friend_requests_updated");
        io.to(targetId).emit("friend_requests_updated");
        io.to(userId.toString()).emit("block_status_changed", { userId: targetId });
        io.to(targetId).emit("block_status_changed", { userId: userId.toString() });

        const blockedMe = await Block.exists({ blockedBy: targetId, blockedUser: userId });
        return res.status(200).json({ blockedByMe: true, blockedMe: !!blockedMe });
    } catch (error) {
        console.error("Lỗi khi chặn người dùng:", error);
        return res.status(500).json({ message: "Lỗi hệ thống." });
    }
};

export const unblockUser = async (req, res) => {
    try {
        const { userId: targetId } = req.params;
        const userId = req.user._id;
        if (!mongoose.isValidObjectId(targetId)) {
            return res.status(400).json({ message: "ID người dùng không hợp lệ." });
        }
        if (targetId === userId.toString()) {
            return res.status(400).json({ message: "ID người dùng không hợp lệ." });
        }

        await Block.deleteOne({ blockedBy: userId, blockedUser: targetId });
        const blockedMe = await Block.exists({ blockedBy: targetId, blockedUser: userId });
        getIO().to(userId.toString()).emit("block_status_changed", { userId: targetId });
        getIO().to(targetId).emit("block_status_changed", { userId: userId.toString() });
        return res.status(200).json({ blockedByMe: false, blockedMe: !!blockedMe });
    } catch (error) {
        console.error("Lỗi khi bỏ chặn người dùng:", error);
        return res.status(500).json({ message: "Lỗi hệ thống." });
    }
};