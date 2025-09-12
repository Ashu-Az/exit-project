import { Role } from '../models/Role.ts';
import type { IRole } from '../interfaces/Role.js';

export class RoleService {
  async getAllRoles(): Promise<IRole[]> {
    return await Role.find({ isActive: true }).lean();
  }

  async getRoleById(id: string): Promise<IRole | null> {
    return await Role.findById(id).lean();
  }

  async getRoleByName(name: string): Promise<IRole | null> {
    return await Role.findOne({ name: name.toLowerCase(), isActive: true }).lean();
  }

  async getRolePermissions(roleId: string): Promise<string[]> {
    const role = await Role.findById(roleId).select('permissions').lean();
    return role?.permissions || [];
  }
}

export const roleService = new RoleService();