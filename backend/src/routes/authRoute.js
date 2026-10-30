import express from 'express'
import { signUp } from '../controllers/authController.js';
import { signIn } from '../controllers/authController.js';
import { signOut } from '../controllers/authController.js';
import { refreshToken } from '../controllers/authController.js';
import { googleLogin } from '../controllers/authController.js';
import { forgotPassword } from '../controllers/authController.js';
import { verifyOtp } from '../controllers/authController.js';
import { resetPassword } from '../controllers/authController.js';

const router = express.Router();

router.post("/signup", signUp);
router.post("/signin", signIn);
router.post("/signout", signOut);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', resetPassword);
router.post("/google", googleLogin);
router.post("/refresh", refreshToken);
export default router;