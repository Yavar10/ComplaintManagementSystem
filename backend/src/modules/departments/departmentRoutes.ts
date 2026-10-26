import { Router } from 'express';
import {
  listDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
} from './departmentController.js';
import { authenticate, authorizeRoles } from '../../middleware/auth.js';

export const departmentRouter = Router();

departmentRouter.use(authenticate);

departmentRouter.get('/', listDepartments);
departmentRouter.get('/:id', getDepartmentById);
departmentRouter.post('/', authorizeRoles('SYSTEM_ADMIN'), createDepartment);
departmentRouter.patch('/:id', authorizeRoles('SYSTEM_ADMIN'), updateDepartment);
