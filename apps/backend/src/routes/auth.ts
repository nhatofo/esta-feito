import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requestOtp, verifyOtp, refreshToken, getMe, logout } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Strict rate limit for OTP requests (prevent SMS abuse)
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 3,
  message: { success: false, error: 'Demasiados pedidos de OTP. Aguarde 10 minutos.' },
});

router.post('/request-otp', otpLimiter, requestOtp);
router.post('/verify-otp', verifyOtp);
router.post('/refresh', refreshToken);
router.get('/me', authenticate, getMe);
router.post('/logout', authenticate, logout);

export default router;
