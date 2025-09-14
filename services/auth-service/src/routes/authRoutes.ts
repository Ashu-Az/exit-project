import { Router } from 'express';
import passport from 'passport';
import rateLimit from 'express-rate-limit';
import { authController } from '../controllers/authController.js';
import { validate } from '../middleware/validation.js';
import { 
  loginSchema, 
  registerSchema, 
  changePasswordSchema, 
  blockUserSchema 
} from '../validations/authValidation.js';

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

if (process.env.NODE_ENV === 'development') {
  router.get('/debug/redis-stats', async (req, res) => {
    try {
      const { getRedisStats } = await import('../utils/redisClient.js');
      const stats = await getRedisStats();
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  router.get('/debug/all-keys', async (req, res) => {
    try {
      const { getAllKeys } = await import('../utils/redisClient.js');
      const allKeys = await getAllKeys();
      
      const keysByType = {
        blocked_user: allKeys.filter(key => key.startsWith('blocked_user:')),
        force_logout: allKeys.filter(key => key.startsWith('force_logout:')),
        blacklist: allKeys.filter(key => key.startsWith('blacklist:')),
        login_attempts: allKeys.filter(key => key.startsWith('login_attempts:')),
        other: allKeys.filter(key => !key.match(/^(blocked_user|force_logout|blacklist|login_attempts):/))
      };
      
      res.json({
        success: true,
        data: {
          totalKeys: allKeys.length,
          keysByType,
          allKeys
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
}

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