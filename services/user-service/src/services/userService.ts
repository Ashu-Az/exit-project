import { User } from '../models/UserSchema.js';
import type { CreateUserRequest, UpdateUserRequest, UserSearchRequest } from '../interfaces/User.js';
import axios from 'axios';

const ROLE_SERVICE_URL = process.env.ROLE_SERVICE_URL || 'http://localhost:3004';

export class UserService {
  async createUser(data: CreateUserRequest) {
    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) {
      throw new Error('User with this email already exists');
    }
    
    await this.validateRoleExists(data.roleId);
    
    const user = new User(data);
    return await user.save();
  }

  async searchUsers(searchRequest: UserSearchRequest) {
    const {
      mongoQuery,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      projection = {},
      search
    } = searchRequest;

    let finalQuery = this.sanitizeMongoQuery(mongoQuery);
    
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

    const [users, totalCount] = await Promise.all([
      User.find(finalQuery, projection)
        .populate('roleId', 'name displayName permissions')
        .sort(sortOptions)
        .limit(limit)
        .skip(offset)
        .lean(),
      User.countDocuments(finalQuery)
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page < Math.ceil(totalCount / limit),
        hasPrev: page > 1
      }
    };
  }

  async getUserById(id: string) {
    return await User.findById(id)
      .populate('roleId', 'name displayName permissions')
      .lean();
  }

  async updateUser(id: string, data: UpdateUserRequest) {
    if (data.roleId) {
      await this.validateRoleExists(data.roleId);
    }
    
    return await User.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    ).populate('roleId', 'name displayName permissions').lean();
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await User.findByIdAndDelete(id);
    return !!result;
  }

  async getUsersByRole(roleName: string) {
    try {
      const roleResponse = await axios.get(`${ROLE_SERVICE_URL}/api/roles/name/${roleName}`);
      const role = roleResponse.data.data;
      
      return await this.searchUsers({
        mongoQuery: { roleId: role._id }
      });
    } catch (error) {
      throw new Error(`Role ${roleName} not found`);
    }
  }

  private async validateRoleExists(roleId: string): Promise<void> {
    try {
      await axios.get(`${ROLE_SERVICE_URL}/api/roles/${roleId}`);
    } catch (error) {
      throw new Error('Invalid role ID');
    }
  }

  private sanitizeMongoQuery(query: Record<string, any>): Record<string, any> {
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
          }
        }
        return cleaned;
      }
      return obj;
    };

    return removeDangerous(sanitized);
  }
}

export const userService = new UserService();