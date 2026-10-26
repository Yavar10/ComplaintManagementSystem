import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/index.js';
import { AppError } from '../../middleware/errorHandler.js';

export async function listNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const unreadOnly = req.query.unreadOnly === 'true';

    const where: any = { recipientUserId: req.user!.id };
    if (unreadOnly) {
      where.readAt = null;
    }

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        include: {
          complaint: { select: { id: true, complaintNumber: true, title: true, priority: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.notification.count({
        where: { recipientUserId: req.user!.id, readAt: null },
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const notif = await prisma.notification.findUnique({ where: { id } });
    if (!notif) throw new AppError('Notification not found.', 404);

    if (notif.recipientUserId !== req.user!.id) {
      throw new AppError('You cannot alter another user\'s notification.', 403);
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });

    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

export async function markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await prisma.notification.updateMany({
      where: { recipientUserId: req.user!.id, readAt: null },
      data: { readAt: new Date() },
    });

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read.',
    });
  } catch (error) {
    next(error);
  }
}
