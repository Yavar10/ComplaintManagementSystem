import { Router } from 'express';
import {
  listNotifications,
  markAsRead,
  markAllAsRead,
} from './notificationController.js';
import { authenticate } from '../../middleware/auth.js';

export const notificationRouter = Router();

notificationRouter.use(authenticate);

notificationRouter.get('/', listNotifications);
notificationRouter.patch('/:id/read', markAsRead);
notificationRouter.post('/read-all', markAllAsRead);
