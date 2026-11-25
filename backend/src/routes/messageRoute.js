import express from 'express'
import {
    sendDirectMessage,
    sendGroupMessage,
    uploadImage,
    uploadAudio,
    cleanupUploadedMedia,
    recallMessage,
    reactToMessage,
    translateMessage,
} from '../controllers/messageController.js';
import { checkGroupMemberShip } from '../middlewares/friendMiddleware.js';

const router = express.Router();

router.post("/direct", sendDirectMessage);
router.post("/group", checkGroupMemberShip, sendGroupMessage);

router.post("/upload", uploadImage);
router.post("/upload-audio", uploadAudio);
router.post("/cleanup-upload", cleanupUploadedMedia);

router.post("/:messageId/reaction", reactToMessage);
router.post("/:messageId/translate", translateMessage);
router.delete("/:messageId", recallMessage);

export default router;