import Friend from "../models/Friend.js";
import User from "../models/User.js";
import FriendRequest from "../models/FriendRequest.js";
import { json } from "express";

export const sendFriendRequest = async (req, res) => {
    try {
        const { to, message } = req.body;
        const from = req.user._id;

        if (from === to) {
            return res.status(400).json({ message: "Không thể gửi lời mời kết bạn cho chính mình" });

        }

        const userExists = await User.exists({ _id: to });
        if (!userExists) return res.status(404).json({ message: "Người dùng không tồn tại" });

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

        // pre('save') trong Friend sẽ tự sắp xếp userA < userB
        const friend = await Friend.create({
            userA: request.from,
            userB: request.to,
        });

        await FriendRequest.findByIdAndDelete(requestId);

        const from = await User.findById(request.from)
            .select("_id displayName avataUrl")
            .lean();

        return res.status(200).json({
            message: "Chấp nhận lời mời kết bạn thành công",
            newFriend: {
                _id: from?._id,
                displayName: from?.displayName,
                avataUrl: from?.avataUrl,
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
            .populate("userA", "_id displayName avataUrl")
            .populate("userB", "_id displayName avataUrl")
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
        const populateFields = "_id username displayName avataUrl";

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