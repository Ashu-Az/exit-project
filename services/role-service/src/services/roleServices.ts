import { Role } from '../models/Role.js';
import type { IRole } from '../interfaces/Role.js';

export class RoleService {
  async getAllRoles(): Promise<IRole[]> {
    try {
      console.log('Fetching all active roles');
      const roles = await Role.find({ isActive: true }).lean();
      console.log(`Retrieved ${roles.length} active roles`);
      return roles;
    } catch (error: any) {
      console.error('Get all roles service error:', error.message);
      throw error;
    }
  }

  async getRoleById(id: string): Promise<IRole | null> {
    try {
      console.log('Fetching role by ID:', id);
      const role = await Role.findById(id).lean();
      if (role) {
        console.log('Role found:', role.name);
      } else {
        console.log('No role found with ID:', id);
      }
      return role;
    } catch (error: any) {
      console.error('Get role by ID service error:', error.message);
      throw error;
    }
  }

  async getRoleByName(name: string): Promise<IRole | null> {
    try {
      const searchName = name.toLowerCase();
      console.log('Fetching role by name:', searchName);
      const role = await Role.findOne({ 
        name: searchName, 
        isActive: true 
      }).lean();
      if (role) {
        console.log('Role found by name:', role.name);
      } else {
        console.log('No role found with name:', searchName);
      }
      return role;
    } catch (error: any) {
      console.error('Get role by name service error:', error.message);
      throw error;
    }
  }

  async getRolePermissions(roleId: string): Promise<string[]> {
    try {
      console.log('Fetching permissions for role ID:', roleId);
      const role = await Role.findById(roleId).select('permissions').lean();
      const permissions = role?.permissions || [];
      console.log(`Retrieved ${permissions.length} permissions`);
      return permissions;
    } catch (error: any) {
      console.error('Get role permissions service error:', error.message);
      throw error;
    }
  }

  async createDefaultRoles(): Promise<void> {
    try {
      console.log('Creating default roles if they do not exist');
      
      const defaultRoles = [
        {
          name: 'admin',
          displayName: 'Administrator',
          description: 'System administrator with full access',
          permissions: ['*'],
          isActive: true
        },
        {
          name: 'user',
          displayName: 'User',
          description: 'Regular user with limited access',
          permissions: ['profile:read', 'profile:update'],
          isActive: true
        }
      ];

      for (const roleData of defaultRoles) {
        const existingRole = await Role.findOne({ name: roleData.name });
        if (!existingRole) {
          const role = new Role(roleData);
          await role.save();
          console.log('Created default role:', roleData.name);
        }
      }
    } catch (error: any) {
      console.error('Create default roles error:', error.message);
      throw error;
    }
  }
}

export const roleService = new RoleService();