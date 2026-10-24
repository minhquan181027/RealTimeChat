import express from 'express'
import { authMe } from '../controllers/userCtrl.js';
import { protectedRoute } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get("/authme", protectedRoute, authMe);

export default router;