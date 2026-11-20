import express from "express";
import { getLiveKitToken } from "../controllers/livekitController.js";

const router = express.Router();

// Route này cần được bảo vệ (chỉ user đăng nhập mới được lấy token)
router.post("/token", getLiveKitToken);

export default router;