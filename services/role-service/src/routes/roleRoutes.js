import { Router } from 'express';
import { roleController } from '../controllers/roleController.js';

const router = Router();

router.get('/', roleController.getAllRoles);
router.get('/:id', roleController.getRoleById);
router.get('/name/:name', roleController.getRoleByName);
router.get('/:id/permissions', roleController.getRolePermissions);

export default router;