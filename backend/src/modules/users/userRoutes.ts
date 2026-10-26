import { Router } from 'express';
import {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  toggleUserStatus,
} from './userController.js';
import { authenticate, authorizeRoles } from '../../middleware/auth.js';

export const userRouter = Router();

userRouter.use(authenticate);

userRouter.get('/', authorizeRoles('SYSTEM_ADMIN', 'ADMINISTRATOR', 'DEPARTMENT_HEAD', 'READ_ONLY_AUDITOR'), listUsers);
userRouter.get('/:id', getUserById);
userRouter.post('/', authorizeRoles('SYSTEM_ADMIN'), createUser);
userRouter.patch('/:id', authorizeRoles('SYSTEM_ADMIN'), updateUser);
userRouter.patch('/:id/status', authorizeRoles('SYSTEM_ADMIN'), toggleUserStatus);
