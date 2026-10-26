import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config, prisma } from '../../config/index.js';
import { AppError } from '../../middleware/errorHandler.js';
import { logAuditEvent } from '../../services/auditService.js';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        role: true,
        department: true,
      },
    });

    if (!user) {
      throw new AppError('Invalid email or password.', 401);
    }

    if (!user.isActive) {
      throw new AppError('This account has been deactivated. Please contact an administrator.', 403);
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Invalid email or password.', 401);
    }

    // Update lastLoginAt
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, role: user.role.name, email: user.email },
      config.jwtSecret,
      { expiresIn: '24h' }
    );

    // Set HttpOnly cookie
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: config.env === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/',
    });

    await logAuditEvent({
      actorUserId: user.id,
      action: 'USER_LOGIN',
      entityType: 'USER',
      entityId: user.id,
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      data: {
        token, // Also return in body for testing/flexibility
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role.name,
          roleId: user.roleId,
          departmentId: user.departmentId,
          departmentName: user.department?.name || null,
          lastLoginAt: user.lastLoginAt,
        },
      },
      message: 'Login successful.',
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.user) {
      await logAuditEvent({
        actorUserId: req.user.id,
        action: 'USER_LOGOUT',
        entityType: 'USER',
        entityId: req.user.id,
        ipAddress: req.ip,
      });
    }

    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: config.env === 'production',
      sameSite: 'lax',
      path: '/',
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (error) {
    next(error);
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Unauthorized', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
        department: true,
      },
    });

    if (!user) {
      throw new AppError('User not found.', 404);
    }

    const permissions = user.role.permissions.map((rp) => rp.permission.name);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role.name,
          roleId: user.roleId,
          departmentId: user.departmentId,
          departmentName: user.department?.name || null,
          isActive: user.isActive,
          lastLoginAt: user.lastLoginAt,
          permissions,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}
