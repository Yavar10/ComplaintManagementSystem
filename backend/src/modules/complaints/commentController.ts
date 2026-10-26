import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/index.js';
import { AppError } from '../../middleware/errorHandler.js';
import { logAuditEvent } from '../../services/auditService.js';
import { CommentVisibility } from '@prisma/client';

export async function addComment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { content, visibility } = z.object({
      content: z.string().min(2, 'Note cannot be empty'),
      visibility: z.nativeEnum(CommentVisibility).default(CommentVisibility.INTERNAL),
    }).parse(req.body);

    const complaint = await prisma.complaint.findUnique({ where: { id } });
    if (!complaint) throw new AppError('Complaint not found.', 404);

    const comment = await prisma.complaintComment.create({
      data: {
        complaintId: id,
        authorUserId: req.user!.id,
        content,
        visibility,
      },
      include: {
        author: { select: { id: true, fullName: true, role: { select: { name: true } } } },
      },
    });

    await logAuditEvent({
      actorUserId: req.user?.id,
      action: 'COMMENT_ADDED',
      entityType: 'COMPLAINT',
      entityId: id,
      newValues: { visibility, preview: content.slice(0, 40) },
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      data: comment,
      message: 'Investigation note added.',
    });
  } catch (error) {
    next(error);
  }
}

export async function listComments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const comments = await prisma.complaintComment.findMany({
      where: { complaintId: id },
      include: {
        author: { select: { id: true, fullName: true, role: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.status(200).json({
      success: true,
      data: comments,
    });
  } catch (error) {
    next(error);
  }
}
