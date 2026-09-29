import express from 'express';
import { register, login, logout, getMe, changePassword } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { registerLimiter, loginLimiter } from '../middleware/rateLimiters.js';
import validate from '../middleware/validate.js';
import { registerSchema, loginSchema, changePasswordSchema } from '../validators/authValidator.js';

const router = express.Router();

router.post('/register', registerLimiter, validate({ body: registerSchema }), register);
router.post('/login', loginLimiter, validate({ body: loginSchema }), login);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.post('/change-password', protect, validate({ body: changePasswordSchema }), changePassword);

export default router;
