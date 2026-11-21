import express from 'express'
import {
    createConversation,
    getConversations,
    getMessages, markAsRead,
    acceptConversation,
    declineConversation,
    addMembers
} from '../controllers/conversationController.js'


const router = express.Router();

router.post("/", createConversation);
router.get("/", getConversations);
router.get("/:conversationId/messages", getMessages);
router.put("/:conversationId/read", markAsRead);
router.put("/:conversationId/accept", acceptConversation);
router.put("/:conversationId/decline", declineConversation);
router.post("/:conversationId/members", addMembers);

export default router;