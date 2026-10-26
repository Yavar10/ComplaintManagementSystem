import { Router } from 'express';
import { login, logout, getMe } from './authController.js';
import { authenticate } from '../../middleware/auth.js';

export const authRouter = Router();

authRouter.post('/login', login);
authRouter.post('/logout', logout);
authRouter.get('/me', authenticate, getMe);
