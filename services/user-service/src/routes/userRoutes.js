import { Router } from 'express';
import { userController } from '../controllers/userController.js';
import { validate } from '../middleware/validation.js';
import { createUserSchema, updateUserSchema, searchUsersSchema, idSchema } from '../validations/userValidations.js';

const router = Router();

// Single dynamic search endpoint
router.post('/search', validate(searchUsersSchema), userController.searchUsers);

// Basic CRUD
router.get('/:id', validate(idSchema), userController.getUserById);
router.post('/', validate(createUserSchema), userController.createUser);
router.put('/:id', validate(idSchema), validate(updateUserSchema), userController.updateUser);
router.delete('/:id', validate(idSchema), userController.deleteUser);

// Role-based queries
router.get('/role/:roleName', userController.getUsersByRole);

export default router;