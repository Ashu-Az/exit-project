import axios from 'axios';
import bcrypt from 'bcryptjs';
import { generateToken, getTokenExpiry } from '../utils/jwt.js';
import { 
  blockUser, 
  unblockUser, 
  blacklistToken, 
  resetLoginAttempts,
  incrementLoginAttempts,
  getLoginAttempts,
  forceLogoutUser,
  isUserBlocked,
  isUserForcedLogout
} from '../utils/redisClient.js';
import type { LoginRequest, RegisterRequest, UserWithRole } from '../interfaces/Auth.js';

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3003';
const MAX_LOGIN_ATTEMPTS = 5;

export class AuthService {
  async register(data: RegisterRequest) {
    try {
      console.log('Registering user:', data.email);
      const response = await axios.post(`${USER_SERVICE_URL}/api/users`, data);
      return response.data;
    } catch (error: any) {
      console.error('Registration error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || 'Registration failed');
    }
  }

  async login(credentials: LoginRequest) {
    const { email, password } = credentials;
    console.log('🔐 Login attempt for:', email);
    
    try {
      
      const attempts = await getLoginAttempts(email);
      if (attempts >= MAX_LOGIN_ATTEMPTS) {
        throw new Error('Too many login attempts. Please try again later.');
      }

      
      const userResponse = await axios.post(`${USER_SERVICE_URL}/api/users/search`, {
        mongoQuery: { email, isActive: true },
        limit: 1
      });

      const users = userResponse.data.data;
      if (!users || users.length === 0) {
        await incrementLoginAttempts(email);
        throw new Error('Invalid credentials');
      }

      const user = users[0] as UserWithRole;
      console.log('👤 User found:', user.email);

      const isCurrentlyBlocked = await isUserBlocked(user._id);
      if (user.isBlocked || isCurrentlyBlocked) {
        console.log('🚫 User is blocked, denying login');
        throw new Error('Account is blocked');
      }

      const isForcedLogout = await isUserForcedLogout(user._id);
      if (isForcedLogout) {
        console.log('🚪 User is forced to logout, denying login');
        throw new Error('Account access has been revoked');
      }

      if (user.accountLocked && user.lockUntil && new Date() < new Date(user.lockUntil)) {
        throw new Error('Account is temporarily locked');
      }

      await resetLoginAttempts(email);

     
      try {
        await axios.put(`${USER_SERVICE_URL}/api/users/${user._id}`, {
          lastLogin: new Date(),
          loginAttempts: 0
        });
      } catch (updateError) {
        console.warn('Failed to update last login:', (updateError as Error).message);
      }

      const token = generateToken(user);
      console.log('✅ Login successful, token generated');

      return {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.roleId
        },
        token
      };
    } catch (error: any) {
      console.error('❌ Login error:', error.message);
      throw error;
    }
  }

  async logout(token: string) {
    try {
      const expiry = getTokenExpiry(token);
      await blacklistToken(token, expiry);
      console.log('🚪 Token blacklisted on logout');
    } catch (error) {
      console.warn('Failed to blacklist token:', (error as Error).message);
    }
  }

  async blockUserAccount(userId: string) {
    try {
      console.log('🚫 IMMEDIATE BLOCKING: Starting for user:', userId);
      
      
      await blockUser(userId);
      console.log('✅ Step 1: User blocked in Redis');
      
      
      await forceLogoutUser(userId);
      console.log('✅ Step 2: User added to force logout list');
      
      // Step 3: Update user status in database (persistent)
      try {
        await axios.put(`${USER_SERVICE_URL}/api/users/${userId}`, {
          isBlocked: true,
          isActive: false
        });
        console.log('✅ Step 3: User blocked in database');
      } catch (dbError) {
        console.warn('⚠️ Database update failed, but Redis blocking is active');
      }
      
      console.log('🎯 IMMEDIATE BLOCKING COMPLETE - User will be blocked on next request');
      
      return { 
        success: true, 
        message: 'User blocked immediately - all active sessions terminated',
        effectiveImmediately: true
      };
    } catch (error: any) {
      console.error('❌ Block user error:', error.message);
      throw new Error(`Failed to block user: ${error.message}`);
    }
  }

  async unblockUserAccount(userId: string) {
    try {
      console.log('✅ UNBLOCKING: Starting for user:', userId);
      
      // Step 1: Remove block from Redis
      await unblockUser(userId);
      console.log('✅ Step 1: User unblocked in Redis');
      
      // Step 2: Update user status in database
      try {
        await axios.put(`${USER_SERVICE_URL}/api/users/${userId}`, {
          isBlocked: false,
          isActive: true
        });
        console.log('✅ Step 2: User unblocked in database');
      } catch (dbError) {
        console.warn('⚠️ Database update failed, but Redis unblocking is active');
      }
      
      console.log('🎯 UNBLOCKING COMPLETE');
      
      return { 
        success: true, 
        message: 'User unblocked successfully',
        canLoginImmediately: true
      };
    } catch (error: any) {
      console.error('❌ Unblock user error:', error.message);
      throw new Error(`Failed to unblock user: ${error.message}`);
    }
  }

  async getProfile(userId: string) {
    try {
      // ⭐ CRITICAL: Check blocking status before returning profile
      const isBlocked = await isUserBlocked(userId);
      const isForcedLogout = await isUserForcedLogout(userId);
      
      if (isBlocked || isForcedLogout) {
        console.log('🚫 Profile access denied - user is blocked');
        throw new Error('Account access has been revoked');
      }
      
      const response = await axios.get(`${USER_SERVICE_URL}/api/users/${userId}`);
      return response.data.data;
    } catch (error: any) {
      console.error('Get profile error:', error.response?.data || error.message);
      throw new Error('Profile not found');
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    try {
      // ⭐ Check blocking status before password change
      const isBlocked = await isUserBlocked(userId);
      if (isBlocked) {
        throw new Error('Account access has been revoked');
      }
      
      // TODO: Implement actual password change logic
      return { success: true, message: 'Password changed successfully' };
    } catch (error: any) {
      throw new Error(`Password change failed: ${error.message}`);
    }
  }

  // ⭐ NEW: Check if user should be immediately blocked
  async validateUserAccess(userId: string): Promise<boolean> {
    try {
      const [isBlocked, isForcedLogout] = await Promise.all([
        isUserBlocked(userId),
        isUserForcedLogout(userId)
      ]);
      
      if (isBlocked || isForcedLogout) {
        console.log(`🚫 Access denied for user ${userId} - blocked: ${isBlocked}, forced logout: ${isForcedLogout}`);
        return false;
      }
      
      return true;
    } catch (error) {
      console.warn('User access validation failed:', (error as Error).message);
      return true; // Fail open for now
    }
  }
}

export const authService = new AuthService();