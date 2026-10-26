import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config, prisma } from '../config/index.js';
import { AppError } from './errorHandler.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  roleId: string;
  departmentId: string | null;
  departmentName?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    let token = req.cookies?.auth_token;

    // Fallback to Bearer token header
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new AppError('Authentication required. Please log in.', 401);
    }

    const decoded = jwt.verify(token, config.jwtSecret) as { userId: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        role: true,
        department: true,
      },
    });

    if (!user) {
      throw new AppError('User account not found.', 401);
    }

    if (!user.isActive) {
      throw new AppError('User account is deactivated. Contact your regulatory administrator.', 403);
    }

    req.user = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role.name,
      roleId: user.roleId,
      departmentId: user.departmentId,
      departmentName: user.department?.name || null,
    };

    next();
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      next(new AppError('Invalid or expired authentication session.', 401));
    } else {
      next(error);
    }
  }
}

export function authorizeRoles(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }

    // Auditor read-only restriction for mutating operations
    if (req.user.role === 'READ_ONLY_AUDITOR' && req.method !== 'GET') {
      return next(new AppError('Read-only auditors cannot modify records.', 403));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action.', 403));
    }

    next();
  };
}

export function restrictAuditorModifications(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.role === 'READ_ONLY_AUDITOR' && req.method !== 'GET') {
    return next(new AppError('Read-only auditors cannot modify complaint records.', 403));
  }
  next();
}
