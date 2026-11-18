import express from 'express'
import { searchUsers, authMe } from '../controllers/userController.js'
import { protectedRoute } from '../middlewares/authMiddleware.js';
const router = express.Router();

router.get("/me", protectedRoute, authMe);
router.get("/search", searchUsers);   // GET /user/search?q=...

export default router;