import { Router } from 'express';
import {
  getOverview,
  getComplaintsByStatus,
  getComplaintsByDepartment,
  getComplaintsByCategory,
  getInstitutionTrends,
  getSlaPerformance,
  exportComplaintsCsv,
} from './analyticsController.js';
import { authenticate } from '../../middleware/auth.js';

export const analyticsRouter = Router();

analyticsRouter.use(authenticate);

analyticsRouter.get('/overview', getOverview);
analyticsRouter.get('/complaints-by-status', getComplaintsByStatus);
analyticsRouter.get('/complaints-by-department', getComplaintsByDepartment);
analyticsRouter.get('/complaints-by-category', getComplaintsByCategory);
analyticsRouter.get('/institution-trends', getInstitutionTrends);
analyticsRouter.get('/sla-performance', getSlaPerformance);
analyticsRouter.get('/export', exportComplaintsCsv);
