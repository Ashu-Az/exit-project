import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import bcrypt from 'bcryptjs';
import axios from 'axios';
import { verifyToken } from '../utils/jwt.js';
import { isUserBlocked, isTokenBlacklisted, isUserForcedLogout } from '../utils/redisClient.js';
import type { UserWithRole } from '../interfaces/Auth.js';

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3003';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

passport.use(new LocalStrategy(
  { usernameField: 'email' },
  async (email: string, password: string, done) => {
    try {
      console.log('🔐 Local strategy: Login attempt for:', email);
      
      const response = await axios.post(`${USER_SERVICE_URL}/api/users/search`, {
        mongoQuery: { email, isActive: true },
        limit: 1
      });

      const users = response.data.data;
      if (!users || users.length === 0) {
        return done(null, false, { message: 'Invalid credentials' });
      }

      const user = users[0] as UserWithRole;
      console.log('👤 User found:', user.email);
      
      
      const isBlocked = await isUserBlocked(user._id);
      if (user.isBlocked || isBlocked) {
        return done(null, false, { message: 'Account is blocked' });
      }

      
      console.log('✅ Local strategy: Login successful');
      return done(null, user);
    } catch (error: any) {
      console.error('❌ Local strategy error:', error.message);
      return done(error);
    }
  }
));


passport.use(new JwtStrategy(
  {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: JWT_SECRET,
    passReqToCallback: true
  },
  async (req: any, payload: any, done: any) => {
    try {
      const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
      const userId = payload.userId;
      
      console.log(`🔍 JWT Strategy: Validating access for user ${userId}`);
      
      
      if (token) {
        try {
          const blacklisted = await isTokenBlacklisted(token);
          if (blacklisted) {
            console.log('🚫 JWT Strategy: Token is blacklisted');
            return done(null, false, { message: 'Token has been invalidated' });
          }
        } catch (redisError) {
          console.warn('⚠️ Redis blacklist check failed, continuing');
        }
      }

  
      try {
        const blocked = await isUserBlocked(userId);
        if (blocked) {
          console.log('🚫 JWT Strategy: User is blocked by admin');
          return done(null, false, { message: 'Account has been blocked by administrator' });
        }
      } catch (redisError) {
        console.warn('⚠️ Redis block check failed, continuing');
      }

      try {
        const forcedLogout = await isUserForcedLogout(userId);
        if (forcedLogout) {
          console.log('🚪 JWT Strategy: User session invalidated by admin');
          return done(null, false, { message: 'Your session has been terminated by administrator' });
        }
      } catch (redisError) {
        console.warn('⚠️ Redis force logout check failed, continuing');
      }

      console.log('✅ JWT Strategy: All checks passed for user:', userId);
      return done(null, payload);
    } catch (error) {
      console.error('❌ JWT Strategy error:', error);
      return done(error);
    }
  }
));

export default passport;