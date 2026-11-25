import express from 'express'
import { searchUsers, authMe, getUserProfile, updateProfile, completeProfileSetup } from '../controllers/userController.js'
import { protectedRoute, requireSetupComplete } from '../middlewares/authMiddleware.js';
const router = express.Router();

router.get("/me", protectedRoute, authMe);
router.post("/me/setup", protectedRoute, completeProfileSetup);
router.put("/me", protectedRoute, requireSetupComplete, updateProfile);
router.get("/search", requireSetupComplete, searchUsers);
router.get("/:id", requireSetupComplete, getUserProfile);

export default router;