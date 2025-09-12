import { roleService } from '../services/roleServices.js';
import {Role} from "../models/Role.js";

export class RoleController {
  async getAllRoles(req, res) {
    try {
      const roles = await roleService.getAllRoles();
      res.json({ success: true, data: roles });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getRoleById(req, res) {
    try {
      const role = await roleService.getRoleById(req.params.id);
      if (!role) {
        return res.status(404).json({ success: false, error: 'Role not found' });
      }
      res.json({ success: true, data: role });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getRoleByName(req, res) {
    try {
      const role = await roleService.getRoleByName(req.params.name);
      if (!role) {
        return res.status(404).json({ success: false, error: 'Role not found' });
      }
      res.json({ success: true, data: role });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getRolePermissions(req, res) {
    try {
      const permissions = await roleService.getRolePermissions(req.params.id);
      res.json({ success: true, data: permissions });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export const roleController = new RoleController();