import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/index.js';
import { authenticate, authorizeRoles } from '../../middleware/auth.js';

export const auditRouter = Router();

auditRouter.use(authenticate);
auditRouter.use(authorizeRoles('SYSTEM_ADMIN', 'ADMINISTRATOR', 'READ_ONLY_AUDITOR'));

auditRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string || '25', 10)));
    const entityType = req.query.entityType as string | undefined;
    const action = req.query.action as string | undefined;

    const where: any = {};
    if (entityType) where.entityType = entityType;
    if (action) where.action = action;

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          actor: { select: { id: true, fullName: true, email: true, role: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    res.status(200).json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});
