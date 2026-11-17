import express from 'express'
import { createConversation, getConversations, getMessages, markAsRead } from '../controllers/conversationController.js'
import { checkFriendShip } from '../middlewares/friendMiddleware.js';

const router = express.Router();

router.post("/", checkFriendShip, createConversation);
router.get("/", getConversations);
router.get("/:conversationId/messages", getMessages);
router.put("/:conversationId/read", markAsRead);

export default router;