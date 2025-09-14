import { Request, Response } from 'express';
import { roleService } from '../services/roleServices.js';

export class RoleController {
  async getAllRoles(req: Request, res: Response) {
    try {
      console.log('Getting all roles');
      const roles = await roleService.getAllRoles();
      console.log(`Found ${roles.length} roles`);
      res.json({ success: true, data: roles });
    } catch (error: any) {
      console.error('Get all roles error:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getRoleById(req: Request, res: Response) {
    try {
      console.log('Getting role by ID:', req.params.id);
      const role = await roleService.getRoleById(req.params.id);
      if (!role) {
        console.log('Role not found:', req.params.id);
        return res.status(404).json({ success: false, error: 'Role not found' });
      }
      console.log('Role found:', role.name);
      res.json({ success: true, data: role });
    } catch (error: any) {
      console.error('Get role by ID error:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getRoleByName(req: Request, res: Response) {
    try {
      console.log('Getting role by name:', req.params.name);
      const role = await roleService.getRoleByName(req.params.name);
      if (!role) {
        console.log('Role not found by name:', req.params.name);
        return res.status(404).json({ success: false, error: 'Role not found' });
      }
      console.log('Role found by name:', role.name);
      res.json({ success: true, data: role });
    } catch (error: any) {
      console.error('Get role by name error:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getRolePermissions(req: Request, res: Response) {
    try {
      console.log('Getting role permissions for ID:', req.params.id);
      const permissions = await roleService.getRolePermissions(req.params.id);
      console.log(`Found ${permissions.length} permissions`);
      res.json({ success: true, data: permissions });
    } catch (error: any) {
      console.error('Get role permissions error:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export const roleController = new RoleController();