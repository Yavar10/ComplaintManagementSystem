import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../../config/index.js';
import { AppError } from '../../middleware/errorHandler.js';
import { logAuditEvent } from '../../services/auditService.js';

const createUserSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  roleId: z.string().uuid('Valid role ID is required'),
  departmentId: z.string().uuid().optional().nullable(),
});

export async function listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string || '20', 10)));
    const departmentId = req.query.departmentId as string;
    const roleId = req.query.roleId as string;
    const search = (req.query.search as string || '').trim();

    const where: any = {};
    if (departmentId) where.departmentId = departmentId;
    if (roleId) where.roleId = roleId;
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          fullName: true,
          email: true,
          roleId: true,
          departmentId: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          role: { select: { id: true, name: true } },
          department: { select: { id: true, name: true, code: true } },
          _count: {
            select: { assignedComplaints: true },
          },
        },
        orderBy: { fullName: 'asc' },
      }),
    ]);

    res.status(200).json({
      success: true,
      data: users,
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

export async function getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        email: true,
        roleId: true,
        departmentId: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        role: { select: { id: true, name: true, description: true } },
        department: { select: { id: true, name: true, code: true } },
        assignedComplaints: {
          select: {
            id: true,
            complaintNumber: true,
            title: true,
            status: true,
            priority: true,
            dueAt: true,
          },
          take: 10,
        },
      },
    });

    if (!user) {
      throw new AppError('User not found.', 404);
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

export async function createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = createUserSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        fullName: data.fullName,
        email: data.email.toLowerCase(),
        passwordHash,
        roleId: data.roleId,
        departmentId: data.departmentId || null,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        roleId: true,
        departmentId: true,
        isActive: true,
        createdAt: true,
      },
    });

    await logAuditEvent({
      actorUserId: req.user?.id,
      action: 'USER_CREATED',
      entityType: 'USER',
      entityId: user.id,
      newValues: { fullName: user.fullName, email: user.email, roleId: user.roleId },
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      data: user,
      message: 'User created successfully.',
    });
  } catch (error) {
    next(error);
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const schema = z.object({
      fullName: z.string().min(2).optional(),
      roleId: z.string().uuid().optional(),
      departmentId: z.string().uuid().optional().nullable(),
      password: z.string().min(6).optional(),
    });

    const data = schema.parse(req.body);
    const updateData: any = {};
    if (data.fullName) updateData.fullName = data.fullName;
    if (data.roleId) updateData.roleId = data.roleId;
    if (data.departmentId !== undefined) updateData.departmentId = data.departmentId;
    if (data.password) updateData.passwordHash = await bcrypt.hash(data.password, 10);

    const prev = await prisma.user.findUnique({ where: { id } });
    if (!prev) throw new AppError('User not found.', 404);

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        fullName: true,
        email: true,
        roleId: true,
        departmentId: true,
        isActive: true,
      },
    });

    await logAuditEvent({
      actorUserId: req.user?.id,
      action: 'USER_UPDATED',
      entityType: 'USER',
      entityId: id,
      previousValues: { fullName: prev.fullName, roleId: prev.roleId, departmentId: prev.departmentId },
      newValues: updated,
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      data: updated,
      message: 'User updated successfully.',
    });
  } catch (error) {
    next(error);
  }
}

export async function toggleUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body);

    const prev = await prisma.user.findUnique({ where: { id } });
    if (!prev) throw new AppError('User not found.', 404);

    // Prevent self-deactivation
    if (req.user?.id === id && !isActive) {
      throw new AppError('You cannot deactivate your own account.', 400);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive },
      select: { id: true, email: true, fullName: true, isActive: true },
    });

    await logAuditEvent({
      actorUserId: req.user?.id,
      action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      entityType: 'USER',
      entityId: id,
      newValues: { isActive },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      data: updated,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully.`,
    });
  } catch (error) {
    next(error);
  }
}
