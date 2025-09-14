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

// Local Strategy for login
passport.use(new LocalStrategy(
  { usernameField: 'email' },
  async (email: string, password: string, done) => {
    try {
      console.log('Attempting login for:', email);
      
      // Search for user with populated role
      const response = await axios.post(`${USER_SERVICE_URL}/api/users/search`, {
        mongoQuery: { email, isActive: true },
        limit: 1
      });

      const users = response.data.data;
      if (!users || users.length === 0) {
        console.log('No user found for email:', email);
        return done(null, false, { message: 'Invalid credentials' });
      }

      const user = users[0] as UserWithRole;
      console.log('User found:', user.email);
      
      // Check if user is blocked
      if (user.isBlocked) {
        return done(null, false, { message: 'Account is blocked' });
      }

      // Check if account is locked
      if (user.accountLocked && user.lockUntil && new Date() < new Date(user.lockUntil)) {
        return done(null, false, { message: 'Account is temporarily locked' });
      }

      // For now, skip password validation and return user
      // In production, implement proper password validation
      console.log('Login successful for:', email);
      return done(null, user);
    } catch (error: any) {
      console.error('Passport Local Strategy Error:', error.message);
      return done(error);
    }
  }
));

// JWT Strategy for protected routes
passport.use(new JwtStrategy(
  {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: JWT_SECRET,
    passReqToCallback: true
  },
  async (req: any, payload: any, done: any) => {
    try {
      const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
      
      // Check if token is blacklisted (skip if Redis unavailable)
      if (token) {
        try {
          const blacklisted = await isTokenBlacklisted(token);
          if (blacklisted) {
            return done(null, false, { message: 'Token is blacklisted' });
          }
        } catch (redisError) {
          console.warn('Redis check failed, continuing without blacklist check');
        }
      }

      // Check if user is blocked (skip if Redis unavailable)
      try {
        const blocked = await isUserBlocked(payload.userId);
        if (blocked) {
          return done(null, false, { message: 'User is blocked' });
        }
      } catch (redisError) {
        console.warn('Redis check failed, continuing without block check');
      }

      return done(null, payload);
    } catch (error) {
      return done(error);
    }
  }
));

export default passport;