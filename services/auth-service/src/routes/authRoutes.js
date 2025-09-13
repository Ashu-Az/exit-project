import { Router } from 'express';
import passport from 'passport';
import rateLimit from 'express-rate-limit';
import { authController } from '../controllers/authController';
import { validate } from '../middleware/validation';
import { 
  loginSchema, 
  registerSchema, 
  changePasswordSchema, 
  blockUserSchema 
} from '../validations/authValidation';

const router = Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { success: false, error: 'Too many auth attempts' }
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

// Public routes
router.post('/register', generalLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);

// Protected routes (require authentication)
const authenticate = passport.authenticate('jwt', { session: false });

router.post('/logout', authenticate, authController.logout);
router.get('/profile', authenticate, authController.getProfile);
router.get('/permissions', authenticate, authController.checkPermissions);
router.post('/change-password', authenticate, validate(changePasswordSchema), authController.changePassword);

// Admin routes (require superadmin role)
router.post('/block/:userId', authenticate, validate(blockUserSchema), authController.blockUser);
router.post('/unblock/:userId', authenticate, validate(blockUserSchema), authController.unblockUser);

export default router;