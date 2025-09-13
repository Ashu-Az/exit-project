import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import bcrypt from 'bcryptjs';
import axios from 'axios';
import { verifyToken } from '../utils/jwt.js';
import { isUserBlocked, isTokenBlacklisted } from '../utils/redis.js';
import type { UserWithRole } from '../interfaces/Auth.js';

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3003';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Local Strategy for login
passport.use(new LocalStrategy(
  { usernameField: 'email' },
  async (email: string, password: string, done) => {
    try {
      // Search for user with populated role
      const response = await axios.post(`${USER_SERVICE_URL}/api/users/search`, {
        mongoQuery: { email, isActive: true },
        limit: 1
      });

      const users = response.data.data;
      if (!users || users.length === 0) {
        return done(null, false, { message: 'Invalid credentials' });
      }

      const user = users[0] as UserWithRole;
      
      // Check if user is blocked
      if (user.isBlocked || await isUserBlocked(user._id)) {
        return done(null, false, { message: 'Account is blocked' });
      }

      // Check if account is locked
      if (user.accountLocked && user.lockUntil && new Date() < new Date(user.lockUntil)) {
        return done(null, false, { message: 'Account is temporarily locked' });
      }

      // Verify password (Note: In real app, you'd need the actual user document with password)
      // For now, we'll assume password validation happens in auth service
      const isValidPassword = await bcrypt.compare(password, user.password || '');
      if (!isValidPassword) {
        return done(null, false, { message: 'Invalid credentials' });
      }

      return done(null, user);
    } catch (error) {
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
      
      // Check if token is blacklisted
      if (token && await isTokenBlacklisted(token)) {
        return done(null, false, { message: 'Token is blacklisted' });
      }

      // Check if user is blocked
      if (await isUserBlocked(payload.userId)) {
        return done(null, false, { message: 'User is blocked' });
      }

      return done(null, payload);
    } catch (error) {
      return done(error);
    }
  }
));

export default passport;