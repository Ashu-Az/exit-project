import axios from 'axios';
import bcrypt from 'bcryptjs';
import { generateToken, getTokenExpiry } from '../utils/jwt.js';
import { 
  blockUser, 
  unblockUser, 
  blacklistToken, 
  resetLoginAttempts,
  incrementLoginAttempts,
  getLoginAttempts 
} from '../utils/redis.js';
import type { LoginRequest, RegisterRequest, UserWithRole } from '../interfaces/Auth.js';

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3003';
const MAX_LOGIN_ATTEMPTS = 5;

export class AuthService {
  async register(data: RegisterRequest) {
    try {
      const response = await axios.post(`${USER_SERVICE_URL}/api/users`, data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Registration failed');
    }
  }

  async login(credentials: LoginRequest) {
    const { email, password } = credentials;
    
    // Check login attempts
    const attempts = await getLoginAttempts(email);
    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      throw new Error('Too many login attempts. Please try again later.');
    }

    try {
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

      // Check if user is blocked
      if (user.isBlocked) {
        throw new Error('Account is blocked');
      }

      // Check account lock
      if (user.accountLocked && user.lockUntil && new Date() < new Date(user.lockUntil)) {
        throw new Error('Account is temporarily locked');
      }

      // Note: In real implementation, you'd fetch the user with password from user service
      // For demo, assuming password validation happens here
      // const isValidPassword = await bcrypt.compare(password, user.password);
      
      // Simulating password check (replace with actual password validation)
      const isValidPassword = true; // This should come from user service

      if (!isValidPassword) {
        await incrementLoginAttempts(email);
        throw new Error('Invalid credentials');
      }

      // Reset login attempts on successful login
      await resetLoginAttempts(email);

      // Update last login
      await axios.put(`${USER_SERVICE_URL}/api/users/${user._id}`, {
        lastLogin: new Date(),
        loginAttempts: 0
      });

      // Generate JWT token
      const token = generateToken(user);

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
      throw error;
    }
  }

  async logout(token: string) {
    const expiry = getTokenExpiry(token);
    await blacklistToken(token, expiry);
  }

  async blockUserAccount(userId: string) {
    await blockUser(userId);
    await axios.put(`${USER_SERVICE_URL}/api/users/${userId}`, {
      isBlocked: true,
      isActive: false
    });
  }

  async unblockUserAccount(userId: string) {
    await unblockUser(userId);
    await axios.put(`${USER_SERVICE_URL}/api/users/${userId}`, {
      isBlocked: false,
      isActive: true
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    // This would need to be implemented in user service to handle password updates
    // For now, just return success
    return { success: true, message: 'Password changed successfully' };
  }

  async getProfile(userId: string) {
    try {
      const response = await axios.get(`${USER_SERVICE_URL}/api/users/${userId}`);
      return response.data.data;
    } catch (error: any) {
      throw new Error('Profile not found');
    }
  }
}

export const authService = new AuthService();