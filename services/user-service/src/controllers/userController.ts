import { Request, Response } from 'express';
import { userService } from '../services/userService.js';

export class UserController {
  async searchUsers(req: Request, res: Response) {
    try {
      console.log('Search users controller called with body:', JSON.stringify(req.body, null, 2));
      
      if (!req.body || Object.keys(req.body).length === 0) {
        console.log('Empty request body, using defaults');
        req.body = { mongoQuery: {} };
      }
      
      const result = await userService.searchUsers(req.body);
      
      console.log('Search successful, returning results');
      res.json({
        success: true,
        data: result.users,
        pagination: result.pagination
      });
    } catch (error: any) {
      console.error('Search users controller error:', error.message);
      console.error('Error stack:', error.stack);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to search users'
      });
    }
  }

  async createUser(req: Request, res: Response) {
    try {
      console.log('Create user controller called');
      const user = await userService.createUser(req.body);
      res.status(201).json({
        success: true,
        data: user
      });
    } catch (error: any) {
      console.error('Create user controller error:', error.message);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to create user'
      });
    }
  }

  async getUserById(req: Request, res: Response) {
    try {
      console.log('Get user by ID controller called:', req.params.id);
      const user = await userService.getUserById(req.params.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      res.json({
        success: true,
        data: user
      });
    } catch (error: any) {
      console.error('Get user by ID controller error:', error.message);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get user'
      });
    }
  }

  async updateUser(req: Request, res: Response) {
    try {
      console.log('Update user controller called:', req.params.id);
      const user = await userService.updateUser(req.params.id, req.body);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      res.json({
        success: true,
        data: user
      });
    } catch (error: any) {
      console.error('Update user controller error:', error.message);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to update user'
      });
    }
  }

  async deleteUser(req: Request, res: Response) {
    try {
      console.log('Delete user controller called:', req.params.id);
      const deleted = await userService.deleteUser(req.params.id);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error: any) {
      console.error('Delete user controller error:', error.message);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete user'
      });
    }
  }

  async getUsersByRole(req: Request, res: Response) {
    try {
      console.log('Get users by role controller called:', req.params.roleName);
      const result = await userService.getUsersByRole(req.params.roleName);
      res.json({
        success: true,
        data: result.users
      });
    } catch (error: any) {
      console.error('Get users by role controller error:', error.message);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get users by role'
      });
    }
  }
}

export const userController = new UserController();