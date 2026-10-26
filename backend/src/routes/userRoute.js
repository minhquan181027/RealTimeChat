import express from 'express'
import { authMe } from '../controllers/userCtrl.js';
import { protectedRoute } from '../middlewares/authMiddleware.js';
import { test } from '../controllers/userCtrl.js';
const router = express.Router();

router.get("/me", protectedRoute, authMe);
router.get("/test", test);
export default router;