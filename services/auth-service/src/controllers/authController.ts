import type { Request, Response } from 'express';
import { authService } from '../services/authServices';
import { defineAbilityFor } from '../utils/ability';
import type { JWTPayload } from '../interfaces/Auth';

export class AuthController {
  async register(req: Request, res: Response) {
    try {
      const result = await authService.register(req.body);
      res.status(201).json({
        success: true,
        data: result.data,
        message: 'User registered successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const result = await authService.login(req.body);
      res.json({
        success: true,
        data: result,
        message: 'Login successful'
      });
    } catch (error: any) {
      res.status(401).json({
        success: false,
        error: error.message
      });
    }
  }

  async logout(req: Request, res: Response) {
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '');
      if (!token) {
        return res.status(400).json({
          success: false,
          error: 'No token provided'
        });
      }

      await authService.logout(token);
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getProfile(req: Request, res: Response) {
    try {
      const user = req.user as JWTPayload;
      const profile = await authService.getProfile(user.userId);
      
      res.json({
        success: true,
        data: profile,
        message: 'Profile retrieved successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async changePassword(req: Request, res: Response) {
    try {
      const user = req.user as JWTPayload;
      const { currentPassword, newPassword } = req.body;
      
      const result = await authService.changePassword(user.userId, currentPassword, newPassword);
      res.json({
        success: true,
        data: result,
        message: 'Password changed successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async blockUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      await authService.blockUserAccount(userId);
      
      res.json({
        success: true,
        message: 'User blocked successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async unblockUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      await authService.unblockUserAccount(userId);
      
      res.json({
        success: true,
        message: 'User unblocked successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async checkPermissions(req: Request, res: Response) {
    try {
      const user = req.user as JWTPayload;
      const ability = defineAbilityFor(user);
      
      res.json({
        success: true,
        data: {
          user: {
            id: user.userId,
            name: user.name,
            email: user.email,
            role: user.role
          },
          permissions: user.role.permissions,
          abilities: ability.rules
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

export const authController = new AuthController();