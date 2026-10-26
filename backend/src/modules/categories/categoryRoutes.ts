import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/index.js';
import { authenticate } from '../../middleware/auth.js';

export const categoryRouter = Router();

categoryRouter.use(authenticate);

categoryRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.complaintCategory.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
});

categoryRouter.get('/roles', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const roles = await prisma.role.findMany({
      orderBy: { name: 'asc' },
    });
    res.status(200).json({ success: true, data: roles });
  } catch (error) {
    next(error);
  }
});
