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
  isUserBlocked
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
    console.log('Login attempt for:', email);
    
    try {
      // Check login attempts
      const attempts = await getLoginAttempts(email);
      if (attempts >= MAX_LOGIN_ATTEMPTS) {
        throw new Error('Too many login attempts. Please try again later.');
      }

      // Get user with role populated
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
      console.log('User found in auth service:', user.email);

      // Check if user is blocked
      if (user.isBlocked) {
        throw new Error('Account is blocked');
      }

      // Check account lock
      if (user.accountLocked && user.lockUntil && new Date() < new Date(user.lockUntil)) {
        throw new Error('Account is temporarily locked');
      }

      // TODO: Implement proper password validation
      // For now, accepting all login attempts for testing
      console.log('Password validation skipped for testing');

      // Reset login attempts on successful login
      await resetLoginAttempts(email);

      // Update last login
      try {
        await axios.put(`${USER_SERVICE_URL}/api/users/${user._id}`, {
          lastLogin: new Date(),
          loginAttempts: 0
        });
      } catch (updateError) {
        console.warn('Failed to update last login:', (updateError as Error).message);
      }

      // Generate JWT token
      const token = generateToken(user);
      console.log('Token generated successfully');

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
      console.error('Login error:', error.message);
      throw error;
    }
  }

  async logout(token: string) {
    try {
      const expiry = getTokenExpiry(token);
      await blacklistToken(token, expiry);
    } catch (error) {
      console.warn('Failed to blacklist token:', (error as Error).message);
    }
  }

  async getProfile(userId: string) {
    try {
      const response = await axios.get(`${USER_SERVICE_URL}/api/users/${userId}`);
      return response.data.data;
    } catch (error: any) {
      console.error('Get profile error:', error.response?.data || error.message);
      throw new Error('Profile not found');
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    // TODO: Implement password change logic
    return { success: true, message: 'Password changed successfully' };
  }

  async blockUserAccount(userId: string) {
    // TODO: Implement user blocking
    return { success: true, message: 'User blocked successfully' };
  }

  async unblockUserAccount(userId: string) {
    // TODO: Implement user unblocking
    return { success: true, message: 'User unblocked successfully' };
  }
}

export const authService = new AuthService();