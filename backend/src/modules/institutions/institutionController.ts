import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/index.js';
import { AppError } from '../../middleware/errorHandler.js';
import { logAuditEvent } from '../../services/auditService.js';

const institutionSchema = z.object({
  institutionName: z.string().min(3, 'Institution name must be at least 3 characters'),
  institutionCode: z.string().min(3, 'Institution code is required').toUpperCase(),
  institutionType: z.string().min(2, 'Institution type is required'),
  state: z.string().min(2, 'State is required'),
  district: z.string().min(2, 'District is required'),
  address: z.string().min(5, 'Address is required'),
  contactEmail: z.string().email().optional().nullable(),
  contactPhone: z.string().optional().nullable(),
});

export async function listInstitutions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string || '20', 10)));
    const search = (req.query.search as string || req.query.q as string || '').trim();
    const state = (req.query.state as string || '').trim();
    const type = (req.query.type as string || '').trim();

    const where: any = { isActive: true };

    if (search) {
      where.OR = [
        { institutionName: { contains: search, mode: 'insensitive' } },
        { institutionCode: { contains: search, mode: 'insensitive' } },
        { district: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (state) {
      where.state = { equals: state, mode: 'insensitive' };
    }

    if (type) {
      where.institutionType = { equals: type, mode: 'insensitive' };
    }

    const [total, institutions] = await Promise.all([
      prisma.institution.count({ where }),
      prisma.institution.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: { complaints: true },
          },
        },
        orderBy: { institutionName: 'asc' },
      }),
    ]);

    res.status(200).json({
      success: true,
      data: institutions,
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
}

export async function getInstitutionById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const institution = await prisma.institution.findUnique({
      where: { id },
      include: {
        complaints: {
          select: {
            id: true,
            complaintNumber: true,
            title: true,
            priority: true,
            status: true,
            submittedAt: true,
            category: { select: { name: true } },
          },
          orderBy: { submittedAt: 'desc' },
          take: 10,
        },
        _count: {
          select: { complaints: true },
        },
      },
    });

    if (!institution) {
      throw new AppError('Institution not found.', 404);
    }

    // Calculate quick stats
    const totalComplaints = institution._count.complaints;
    const openComplaintsCount = await prisma.complaint.count({
      where: {
        institutionId: id,
        status: { notIn: ['RESOLVED', 'CLOSED', 'REJECTED'] },
      },
    });

    res.status(200).json({
      success: true,
      data: {
        ...institution,
        stats: {
          totalComplaints,
          openComplaints: openComplaintsCount,
          resolvedComplaints: totalComplaints - openComplaintsCount,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getInstitutionComplaints(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string || '20', 10)));

    const [total, complaints] = await Promise.all([
      prisma.complaint.count({ where: { institutionId: id } }),
      prisma.complaint.findMany({
        where: { institutionId: id },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          category: { select: { name: true, code: true } },
          assignedDepartment: { select: { name: true, code: true } },
          assignedOfficer: { select: { fullName: true } },
        },
        orderBy: { submittedAt: 'desc' },
      }),
    ]);

    res.status(200).json({
      success: true,
      data: complaints,
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
}

export async function createInstitution(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = institutionSchema.parse(req.body);

    const institution = await prisma.institution.create({
      data,
    });

    await logAuditEvent({
      actorUserId: req.user?.id,
      action: 'INSTITUTION_CREATED',
      entityType: 'INSTITUTION',
      entityId: institution.id,
      newValues: institution,
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      data: institution,
      message: 'Institution registered successfully.',
    });
  } catch (error) {
    next(error);
  }
}

export async function updateInstitution(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const data = institutionSchema.partial().parse(req.body);

    const prev = await prisma.institution.findUnique({ where: { id } });
    if (!prev) {
      throw new AppError('Institution not found.', 404);
    }

    const updated = await prisma.institution.update({
      where: { id },
      data,
    });

    await logAuditEvent({
      actorUserId: req.user?.id,
      action: 'INSTITUTION_UPDATED',
      entityType: 'INSTITUTION',
      entityId: id,
      previousValues: prev,
      newValues: updated,
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      data: updated,
      message: 'Institution updated successfully.',
    });
  } catch (error) {
    next(error);
  }
}
