import { Router } from 'express';
import {
  listInstitutions,
  getInstitutionById,
  getInstitutionComplaints,
  createInstitution,
  updateInstitution,
} from './institutionController.js';
import { authenticate, authorizeRoles } from '../../middleware/auth.js';

export const institutionRouter = Router();

institutionRouter.use(authenticate);

institutionRouter.get('/', listInstitutions);
institutionRouter.get('/:id', getInstitutionById);
institutionRouter.get('/:id/complaints', getInstitutionComplaints);
institutionRouter.post('/', authorizeRoles('SYSTEM_ADMIN', 'ADMINISTRATOR'), createInstitution);
institutionRouter.patch('/:id', authorizeRoles('SYSTEM_ADMIN', 'ADMINISTRATOR'), updateInstitution);
