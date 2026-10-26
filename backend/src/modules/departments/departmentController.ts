import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/index.js';
import { AppError } from '../../middleware/errorHandler.js';
import { logAuditEvent } from '../../services/auditService.js';

const createDepartmentSchema = z.object({
  name: z.string().min(2, 'Department name is required'),
  code: z.string().min(2, 'Department code is required').toUpperCase(),
  description: z.string().optional(),
});

export async function listDepartments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const departments = await prisma.department.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            users: true,
            assignedComplaints: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.status(200).json({
      success: true,
      data: departments,
    });
  } catch (error) {
    next(error);
  }
}

export async function getDepartmentById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: { select: { name: true } },
            isActive: true,
          },
        },
        _count: {
          select: { assignedComplaints: true },
        },
      },
    });

    if (!department) {
      throw new AppError('Department not found.', 404);
    }

    res.status(200).json({
      success: true,
      data: department,
    });
  } catch (error) {
    next(error);
  }
}

export async function createDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = createDepartmentSchema.parse(req.body);

    const dept = await prisma.department.create({
      data: {
        name: data.name,
        code: data.code,
        description: data.description,
      },
    });

    await logAuditEvent({
      actorUserId: req.user?.id,
      action: 'DEPARTMENT_CREATED',
      entityType: 'DEPARTMENT',
      entityId: dept.id,
      newValues: dept,
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      data: dept,
      message: 'Department created successfully.',
    });
  } catch (error) {
    next(error);
  }
}

export async function updateDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const data = createDepartmentSchema.partial().parse(req.body);

    const prev = await prisma.department.findUnique({ where: { id } });
    if (!prev) {
      throw new AppError('Department not found.', 404);
    }

    const updated = await prisma.department.update({
      where: { id },
      data,
    });

    await logAuditEvent({
      actorUserId: req.user?.id,
      action: 'DEPARTMENT_UPDATED',
      entityType: 'DEPARTMENT',
      entityId: id,
      previousValues: prev,
      newValues: updated,
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      data: updated,
      message: 'Department updated successfully.',
    });
  } catch (error) {
    next(error);
  }
}
