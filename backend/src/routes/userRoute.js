import express from 'express'
import { searchUsers, authMe, getUserProfile } from '../controllers/userController.js'
import { protectedRoute } from '../middlewares/authMiddleware.js';
const router = express.Router();

router.get("/me", protectedRoute, authMe);
router.get("/search", searchUsers);
router.get("/:id", getUserProfile);

export default router;