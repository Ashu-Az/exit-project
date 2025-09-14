import { User } from '../models/UserSchema.js';
import type { CreateUserRequest, UpdateUserRequest, UserSearchRequest } from '../interfaces/User.js';
import axios from 'axios';

const ROLE_SERVICE_URL = process.env.ROLE_SERVICE_URL || 'http://localhost:3004';

export class UserService {
  async createUser(data: CreateUserRequest) {
    try {
      console.log('Creating user:', data.email);
      
      const existingUser = await User.findOne({ email: data.email });
      if (existingUser) {
        throw new Error('User with this email already exists');
      }
      
      // Validate role exists if roleId is provided
      if (data.roleId) {
        await this.validateRoleExists(data.roleId);
      }
      
      const user = new User(data);
      const savedUser = await user.save();
      console.log('User created successfully:', savedUser.email);
      
      // Return user with populated role info
      return await this.populateUserRole(savedUser.toObject());
    } catch (error: any) {
      console.error('Create user error:', error.message);
      throw error;
    }
  }

  async searchUsers(searchRequest: UserSearchRequest) {
    try {
      console.log('Search users request:', JSON.stringify(searchRequest, null, 2));
      
      const {
        mongoQuery = {},
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        projection = {},
        search
      } = searchRequest;

      let finalQuery = this.sanitizeMongoQuery(mongoQuery);
      console.log('Sanitized query:', JSON.stringify(finalQuery, null, 2));
      
      if (search) {
        finalQuery = {
          ...finalQuery,
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
          ]
        };
      }

      const sortOptions: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
      const offset = (page - 1) * limit;

      console.log('Final query:', JSON.stringify(finalQuery, null, 2));
      console.log('Sort options:', sortOptions);

      // Remove populate - just get users without role info for now
      const [users, totalCount] = await Promise.all([
        User.find(finalQuery, projection)
          .sort(sortOptions)
          .limit(limit)
          .skip(offset)
          .lean(),
        User.countDocuments(finalQuery)
      ]);

      console.log(`Found ${users.length} users out of ${totalCount} total`);

      // Populate role information for each user
      const usersWithRoles = await Promise.all(
        users.map(user => this.populateUserRole(user))
      );

      return {
        users: usersWithRoles,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNext: page < Math.ceil(totalCount / limit),
          hasPrev: page > 1
        }
      };
    } catch (error: any) {
      console.error('Search users error:', error.message);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }

  async getUserById(id: string) {
    try {
      console.log('Getting user by ID:', id);
      const user = await User.findById(id).lean();
      
      if (!user) {
        console.log('User not found with ID:', id);
        return null;
      }
      
      // Populate role information
      return await this.populateUserRole(user);
    } catch (error: any) {
      console.error('Get user by ID error:', error.message);
      throw error;
    }
  }

  async updateUser(id: string, data: UpdateUserRequest) {
    try {
      console.log('Updating user:', id, data);
      
      if (data.roleId) {
        await this.validateRoleExists(data.roleId);
      }
      
      const user = await User.findByIdAndUpdate(
        id,
        { $set: data },
        { new: true, runValidators: true }
      ).lean();
      
      if (!user) {
        console.log('User not found for update:', id);
        return null;
      }
      
      // Populate role information
      return await this.populateUserRole(user);
    } catch (error: any) {
      console.error('Update user error:', error.message);
      throw error;
    }
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      console.log('Deleting user:', id);
      const result = await User.findByIdAndDelete(id);
      const deleted = !!result;
      console.log('User deleted:', deleted);
      return deleted;
    } catch (error: any) {
      console.error('Delete user error:', error.message);
      throw error;
    }
  }

  async getUsersByRole(roleName: string) {
    try {
      console.log('Getting users by role:', roleName);
      
      const roleResponse = await axios.get(`${ROLE_SERVICE_URL}/api/roles/name/${roleName}`);
      const role = roleResponse.data.data;
      
      if (!role) {
        throw new Error(`Role ${roleName} not found`);
      }
      
      return await this.searchUsers({
        mongoQuery: { roleId: role._id }
      });
    } catch (error: any) {
      console.error('Get users by role error:', error.message);
      throw new Error(`Failed to get users by role ${roleName}: ${error.message}`);
    }
  }

  // New method to populate role information manually
  private async populateUserRole(user: any): Promise<any> {
    try {
      if (!user.roleId) {
        console.log('User has no roleId, returning without role info');
        return {
          ...user,
          roleId: null
        };
      }

      console.log('Fetching role information for roleId:', user.roleId);
      
      try {
        const roleResponse = await axios.get(`${ROLE_SERVICE_URL}/api/roles/${user.roleId}`, {
          timeout: 5000
        });
        
        if (roleResponse.data.success && roleResponse.data.data) {
          console.log('Role information fetched successfully:', roleResponse.data.data.name);
          return {
            ...user,
            roleId: roleResponse.data.data
          };
        }
      } catch (roleError: any) {
        console.warn('Could not fetch role information:', roleError.message);
        // Return user with roleId as string if we can't fetch role details
        return {
          ...user,
          roleId: user.roleId
        };
      }
      
      return user;
    } catch (error: any) {
      console.error('Error populating user role:', error.message);
      return user;
    }
  }

  private async validateRoleExists(roleId: string): Promise<void> {
    try {
      console.log('Validating role exists:', roleId);
      
      // Check if roleId is a valid MongoDB ObjectId
      if (!roleId || !/^[0-9a-fA-F]{24}$/.test(roleId)) {
        console.log('Invalid roleId format:', roleId);
        throw new Error('Invalid role ID format');
      }
      
      try {
        console.log(`Making request to: ${ROLE_SERVICE_URL}/api/roles/${roleId}`);
        const response = await axios.get(`${ROLE_SERVICE_URL}/api/roles/${roleId}`, {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        console.log('Role validation response:', response.status);
        
        if (!response.data.success || !response.data.data) {
          throw new Error('Role not found');
        }
        
        console.log('Role validation successful:', response.data.data.name);
        
      } catch (roleError: any) {
        console.error('Role service request failed:', {
          message: roleError.message,
          code: roleError.code,
          response: roleError.response?.status
        });
        
        // In development, we'll be more lenient
        if (process.env.NODE_ENV === 'development') {
          console.warn('Development mode: Role service unavailable, skipping validation');
          return;
        }
        
        throw new Error(`Role validation failed: ${roleError.message}`);
      }
    } catch (error: any) {
      console.error('Role validation error:', error.message);
      throw error;
    }
  }

  private sanitizeMongoQuery(query: Record<string, any>): Record<string, any> {
    if (!query || typeof query !== 'object') {
      console.log('Invalid query, using empty object:', query);
      return {};
    }

    const dangerousOps = ['$where', '$eval', '$function'];
    const sanitized = JSON.parse(JSON.stringify(query));
    
    const removeDangerous = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(removeDangerous);
      } else if (obj && typeof obj === 'object') {
        const cleaned: any = {};
        for (const [key, value] of Object.entries(obj)) {
          if (!dangerousOps.includes(key)) {
            cleaned[key] = removeDangerous(value);
          } else {
            console.warn('Removed dangerous operation:', key);
          }
        }
        return cleaned;
      }
      return obj;
    };

    const result = removeDangerous(sanitized);
    console.log('Query sanitization complete');
    return result;
  }
}

export const userService = new UserService();