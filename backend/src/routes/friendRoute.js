import express from 'express'
import {
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    getAllFriends,
    getFriendRequests,
    removeFriend,
    getBlockStatus,
    blockUser,
    unblockUser
} from '../controllers/friendController.js'

const router = express.Router();

router.post('/request', sendFriendRequest);

router.post('/request/:requestId/accept', acceptFriendRequest);
router.post('/request/:requestId/decline', declineFriendRequest);

router.get("/", getAllFriends);
router.get("/request", getFriendRequests);
router.get("/block/:userId", getBlockStatus);
router.post("/block/:userId", blockUser);
router.delete("/block/:userId", unblockUser);

router.delete("/:friendId", removeFriend);

export default router;