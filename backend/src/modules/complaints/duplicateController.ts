import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ReviewStatus } from '@prisma/client';
import { prisma } from '../../config/index.js';
import { AppError } from '../../middleware/errorHandler.js';
import { logAuditEvent } from '../../services/auditService.js';
import { detectRelatedComplaints } from '../../services/duplicateEngine.js';

export async function getRelatedForComplaint(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const relationships = await prisma.complaintRelationship.findMany({
      where: {
        OR: [
          { complaintId: id },
          { relatedComplaintId: id },
        ],
      },
      include: {
        complaint: {
          select: {
            id: true,
            complaintNumber: true,
            title: true,
            status: true,
            priority: true,
            institution: { select: { institutionName: true } },
          },
        },
        relatedComplaint: {
          select: {
            id: true,
            complaintNumber: true,
            title: true,
            status: true,
            priority: true,
            institution: { select: { institutionName: true } },
          },
        },
        reviewedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { similarityScore: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: relationships,
    });
  } catch (error) {
    next(error);
  }
}

export async function triggerDetection(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const results = await detectRelatedComplaints(id);

    res.status(200).json({
      success: true,
      data: results,
      message: `Duplicate detection completed. Found ${results.length} candidate relationship(s).`,
    });
  } catch (error) {
    next(error);
  }
}

export async function listAllRelationships(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const status = req.query.status as ReviewStatus | undefined;

    const where: any = {};
    if (status) where.status = status;

    const relationships = await prisma.complaintRelationship.findMany({
      where,
      include: {
        complaint: {
          include: {
            institution: true,
            category: true,
          },
        },
        relatedComplaint: {
          include: {
            institution: true,
            category: true,
          },
        },
        reviewedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { similarityScore: 'desc' },
      take: 50,
    });

    res.status(200).json({
      success: true,
      data: relationships,
    });
  } catch (error) {
    next(error);
  }
}

export async function reviewRelationship(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { action, reviewNotes } = z.object({
      action: z.enum(['CONFIRMED', 'DISMISSED']),
      reviewNotes: z.string().optional(),
    }).parse(req.body);

    const rel = await prisma.complaintRelationship.findUnique({ where: { id } });
    if (!rel) throw new AppError('Relationship record not found.', 404);

    const status = action === 'CONFIRMED' ? ReviewStatus.CONFIRMED : ReviewStatus.DISMISSED;

    const updated = await prisma.complaintRelationship.update({
      where: { id },
      data: {
        status,
        reviewedByUserId: req.user!.id,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes || null,
      },
      include: {
        complaint: { select: { complaintNumber: true } },
        relatedComplaint: { select: { complaintNumber: true } },
      },
    });

    await logAuditEvent({
      actorUserId: req.user?.id,
      action: `DUPLICATE_RELATIONSHIP_${action}`,
      entityType: 'COMPLAINT_RELATIONSHIP',
      entityId: id,
      newValues: { status, reviewNotes },
      reason: reviewNotes,
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      data: updated,
      message: `Complaint link has been marked as ${status.toLowerCase()}. Neither complaint was deleted.`,
    });
  } catch (error) {
    next(error);
  }
}
