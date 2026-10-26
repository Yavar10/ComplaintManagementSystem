import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Priority, ComplaintStatus, AssignmentType, DepartmentRelationType } from '@prisma/client';
import { prisma } from '../../config/index.js';
import { AppError } from '../../middleware/errorHandler.js';
import { logAuditEvent } from '../../services/auditService.js';
import { generateUniqueComplaintNumber } from '../../utils/complaintNumber.js';
import { calculateComplaintDueAt } from '../../services/slaService.js';
import { detectRelatedComplaints } from '../../services/duplicateEngine.js';
import { validateStatusTransition } from './complaintStateMachine.js';

const createComplaintSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(15, 'Description must be at least 15 characters'),
  categoryId: z.string().uuid('Valid category is required'),
  priority: z.nativeEnum(Priority).default(Priority.MEDIUM),
  institutionId: z.string().uuid('Valid institution is required'),
  source: z.string().default('PORTAL'),
});

export async function listComplaints(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string || '20', 10)));
    const search = (req.query.search as string || '').trim();
    const status = req.query.status as ComplaintStatus | undefined;
    const priority = req.query.priority as Priority | undefined;
    const categoryId = req.query.categoryId as string | undefined;
    const institutionId = req.query.institutionId as string | undefined;
    const departmentId = req.query.departmentId as string | undefined;
    const officerId = req.query.officerId as string | undefined;
    const isOverdue = req.query.isOverdue === 'true';

    const where: any = {};

    // Department Scoping for non-admins
    if (req.user?.role === 'DEPARTMENT_HEAD' && req.user.departmentId) {
      where.OR = [
        { assignedDepartmentId: req.user.departmentId },
        { departments: { some: { departmentId: req.user.departmentId } } },
      ];
    } else if (req.user?.role === 'COMPLAINT_OFFICER' && req.user.departmentId) {
      where.OR = [
        { assignedOfficerId: req.user.id },
        { assignedDepartmentId: req.user.departmentId },
        { departments: { some: { departmentId: req.user.departmentId } } },
      ];
    }

    if (search) {
      const searchCondition = {
        OR: [
          { complaintNumber: { contains: search, mode: 'insensitive' } },
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { institution: { institutionName: { contains: search, mode: 'insensitive' } } },
        ],
      };
      if (where.OR) {
        where.AND = [searchCondition];
      } else {
        where.OR = searchCondition.OR;
      }
    }

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (categoryId) where.categoryId = categoryId;
    if (institutionId) where.institutionId = institutionId;
    if (departmentId) where.assignedDepartmentId = departmentId;
    if (officerId) where.assignedOfficerId = officerId;

    if (isOverdue) {
      where.dueAt = { lt: new Date() };
      where.status = { notIn: [ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED, ComplaintStatus.REJECTED] };
    }

    const [total, complaints] = await Promise.all([
      prisma.complaint.count({ where }),
      prisma.complaint.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          category: { select: { id: true, name: true, code: true } },
          institution: { select: { id: true, institutionName: true, institutionCode: true, state: true, district: true } },
          assignedDepartment: { select: { id: true, name: true, code: true } },
          assignedOfficer: { select: { id: true, fullName: true, email: true } },
          _count: {
            select: {
              comments: true,
              attachments: true,
              sourceRelationships: true,
            },
          },
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

export async function getComplaintById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const complaint = await prisma.complaint.findUnique({
      where: { id },
      include: {
        category: true,
        institution: true,
        assignedDepartment: true,
        assignedOfficer: { select: { id: true, fullName: true, email: true } },
        submittedBy: { select: { id: true, fullName: true, email: true } },
        departments: {
          include: {
            department: true,
            addedBy: { select: { id: true, fullName: true } },
          },
        },
        assignments: {
          include: {
            department: true,
            officer: { select: { id: true, fullName: true, email: true } },
            assignedBy: { select: { id: true, fullName: true } },
          },
          orderBy: { startedAt: 'desc' },
        },
        comments: {
          include: {
            author: { select: { id: true, fullName: true, role: { select: { name: true } } } },
          },
          orderBy: { createdAt: 'asc' },
        },
        attachments: {
          include: {
            uploadedBy: { select: { id: true, fullName: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        sourceRelationships: {
          include: {
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
          },
        },
      },
    });

    if (!complaint) {
      throw new AppError('Complaint not found.', 404);
    }

    // Role check: Department head or officer must be part of primary or collaborating department
    if (
      (req.user?.role === 'DEPARTMENT_HEAD' || req.user?.role === 'COMPLAINT_OFFICER') &&
      req.user.departmentId
    ) {
      const isPrimary = complaint.assignedDepartmentId === req.user.departmentId;
      const isAssignedOfficer = complaint.assignedOfficerId === req.user.id;
      const isCollaborating = complaint.departments.some((d) => d.departmentId === req.user?.departmentId);

      if (!isPrimary && !isAssignedOfficer && !isCollaborating) {
        throw new AppError('You do not have permission to view complaints outside your departmental jurisdiction.', 403);
      }
    }

    res.status(200).json({
      success: true,
      data: complaint,
    });
  } catch (error) {
    next(error);
  }
}

export async function createComplaint(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = createComplaintSchema.parse(req.body);

    const [institution, category] = await Promise.all([
      prisma.institution.findUnique({ where: { id: data.institutionId } }),
      prisma.complaintCategory.findUnique({ where: { id: data.categoryId } }),
    ]);

    if (!institution) throw new AppError('Invalid institution ID.', 400);
    if (!category) throw new AppError('Invalid category ID.', 400);

    const complaintNumber = await generateUniqueComplaintNumber();
    const dueAt = await calculateComplaintDueAt(data.categoryId, data.priority);

    // Default route to department based on category code mapping
    let defaultDepartmentId: string | null = null;
    if (category.code === 'FAC_SHORT') {
      const d = await prisma.department.findUnique({ where: { code: 'FAC' } });
      if (d) defaultDepartmentId = d.id;
    } else if (category.code === 'INFRA_DEF') {
      const d = await prisma.department.findUnique({ where: { code: 'INFRA' } });
      if (d) defaultDepartmentId = d.id;
    } else if (category.code === 'ACAD_NONCOMP') {
      const d = await prisma.department.findUnique({ where: { code: 'ACAD' } });
      if (d) defaultDepartmentId = d.id;
    } else if (category.code === 'FIN_IRREG') {
      const d = await prisma.department.findUnique({ where: { code: 'FIN' } });
      if (d) defaultDepartmentId = d.id;
    } else if (category.code === 'STUD_GRIEV') {
      const d = await prisma.department.findUnique({ where: { code: 'GRIEV' } });
      if (d) defaultDepartmentId = d.id;
    }

    const complaint = await prisma.$transaction(async (tx) => {
      const created = await tx.complaint.create({
        data: {
          complaintNumber,
          title: data.title,
          description: data.description,
          categoryId: data.categoryId,
          priority: data.priority,
          status: ComplaintStatus.SUBMITTED,
          institutionId: data.institutionId,
          submittedByUserId: req.user?.id || null,
          source: data.source,
          assignedDepartmentId: defaultDepartmentId,
          dueAt,
        },
      });

      if (defaultDepartmentId && req.user) {
        await tx.complaintAssignment.create({
          data: {
            complaintId: created.id,
            departmentId: defaultDepartmentId,
            assignedByUserId: req.user.id,
            assignmentType: AssignmentType.INITIAL,
            reason: 'Automated initial intake routing based on grievance category',
          },
        });
      }

      await logAuditEvent(
        {
          actorUserId: req.user?.id,
          action: 'COMPLAINT_CREATED',
          entityType: 'COMPLAINT',
          entityId: created.id,
          newValues: {
            complaintNumber: created.complaintNumber,
            title: created.title,
            priority: created.priority,
            institutionId: created.institutionId,
            assignedDepartmentId: defaultDepartmentId,
          },
          ipAddress: req.ip,
        },
        tx
      );

      return created;
    });

    // Run duplicate detection
    const relatedSuggestions = await detectRelatedComplaints(complaint.id);

    res.status(201).json({
      success: true,
      data: {
        ...complaint,
        relatedSuggestions,
      },
      message: `Complaint registered successfully with reference ${complaintNumber}.`,
    });
  } catch (error) {
    next(error);
  }
}

export async function transitionComplaint(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { targetStatus, reason } = z.object({
      targetStatus: z.nativeEnum(ComplaintStatus),
      reason: z.string().optional(),
    }).parse(req.body);

    const complaint = await prisma.complaint.findUnique({ where: { id } });
    if (!complaint) throw new AppError('Complaint not found.', 404);

    validateStatusTransition(complaint.status, targetStatus);

    if (targetStatus === ComplaintStatus.REJECTED && (!reason || reason.trim().length < 5)) {
      throw new AppError('A valid rejection reason is mandatory.', 400);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updateData: any = { status: targetStatus };
      if (targetStatus === ComplaintStatus.REJECTED) {
        updateData.rejectionReason = reason;
      }

      const resComplaint = await tx.complaint.update({
        where: { id },
        data: updateData,
      });

      await logAuditEvent(
        {
          actorUserId: req.user?.id,
          action: 'STATUS_TRANSITION',
          entityType: 'COMPLAINT',
          entityId: id,
          previousValues: { status: complaint.status },
          newValues: { status: targetStatus, reason },
          reason,
          ipAddress: req.ip,
        },
        tx
      );

      return resComplaint;
    });

    res.status(200).json({
      success: true,
      data: updated,
      message: `Status updated to ${targetStatus}.`,
    });
  } catch (error) {
    next(error);
  }
}

export async function assignComplaint(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const schema = z.object({
      departmentId: z.string().uuid(),
      officerId: z.string().uuid().optional().nullable(),
      reason: z.string().optional(),
      priority: z.nativeEnum(Priority).optional(),
    });

    const data = schema.parse(req.body);

    const complaint = await prisma.complaint.findUnique({ where: { id } });
    if (!complaint) throw new AppError('Complaint not found.', 404);

    const updated = await prisma.$transaction(async (tx) => {
      // Close active assignment
      await tx.complaintAssignment.updateMany({
        where: {
          complaintId: id,
          endedAt: null,
        },
        data: { endedAt: new Date() },
      });

      // Insert new assignment
      await tx.complaintAssignment.create({
        data: {
          complaintId: id,
          departmentId: data.departmentId,
          officerId: data.officerId || null,
          assignedByUserId: req.user!.id,
          assignmentType: complaint.assignedDepartmentId ? AssignmentType.REASSIGNMENT : AssignmentType.INITIAL,
          reason: data.reason || 'Assigned by regulatory supervisor',
        },
      });

      // Update complaint
      const updatedComplaint = await tx.complaint.update({
        where: { id },
        data: {
          assignedDepartmentId: data.departmentId,
          assignedOfficerId: data.officerId || null,
          status: ComplaintStatus.ASSIGNED,
          ...(data.priority ? { priority: data.priority } : {}),
        },
      });

      // Audit log
      await logAuditEvent(
        {
          actorUserId: req.user?.id,
          action: 'COMPLAINT_ASSIGNED',
          entityType: 'COMPLAINT',
          entityId: id,
          previousValues: {
            departmentId: complaint.assignedDepartmentId,
            officerId: complaint.assignedOfficerId,
          },
          newValues: {
            departmentId: data.departmentId,
            officerId: data.officerId,
            reason: data.reason,
          },
          reason: data.reason,
          ipAddress: req.ip,
        },
        tx
      );

      // In-app Notification for assigned officer
      if (data.officerId) {
        await tx.notification.create({
          data: {
            recipientUserId: data.officerId,
            complaintId: id,
            type: 'ASSIGNMENT',
            title: `New Case Assigned: ${complaint.complaintNumber}`,
            message: `You have been assigned to case "${complaint.title}" for investigation.`,
          },
        });
      }

      return updatedComplaint;
    });

    res.status(200).json({
      success: true,
      data: updated,
      message: 'Complaint assigned successfully.',
    });
  } catch (error) {
    next(error);
  }
}

export async function transferComplaint(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { targetDepartmentId, reason } = z.object({
      targetDepartmentId: z.string().uuid('Valid department required'),
      reason: z.string().min(5, 'Transfer justification is mandatory'),
    }).parse(req.body);

    const complaint = await prisma.complaint.findUnique({ where: { id } });
    if (!complaint) throw new AppError('Complaint not found.', 404);

    const targetDept = await prisma.department.findUnique({ where: { id: targetDepartmentId } });
    if (!targetDept) throw new AppError('Target department not found.', 404);

    const updated = await prisma.$transaction(async (tx) => {
      await tx.complaintAssignment.updateMany({
        where: { complaintId: id, endedAt: null },
        data: { endedAt: new Date() },
      });

      await tx.complaintAssignment.create({
        data: {
          complaintId: id,
          departmentId: targetDepartmentId,
          officerId: null,
          assignedByUserId: req.user!.id,
          assignmentType: AssignmentType.TRANSFER,
          reason,
        },
      });

      const resComp = await tx.complaint.update({
        where: { id },
        data: {
          assignedDepartmentId: targetDepartmentId,
          assignedOfficerId: null,
          status: ComplaintStatus.ASSIGNED,
        },
      });

      await logAuditEvent(
        {
          actorUserId: req.user?.id,
          action: 'COMPLAINT_TRANSFERRED',
          entityType: 'COMPLAINT',
          entityId: id,
          previousValues: { departmentId: complaint.assignedDepartmentId },
          newValues: { departmentId: targetDepartmentId, reason },
          reason,
          ipAddress: req.ip,
        },
        tx
      );

      return resComp;
    });

    res.status(200).json({
      success: true,
      data: updated,
      message: `Complaint transferred to ${targetDept.name}.`,
    });
  } catch (error) {
    next(error);
  }
}

export async function addCollaboratingDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { departmentId, relationshipType } = z.object({
      departmentId: z.string().uuid(),
      relationshipType: z.nativeEnum(DepartmentRelationType).default(DepartmentRelationType.COLLABORATING),
    }).parse(req.body);

    const [complaint, department] = await Promise.all([
      prisma.complaint.findUnique({ where: { id } }),
      prisma.department.findUnique({ where: { id: departmentId } }),
    ]);

    if (!complaint) throw new AppError('Complaint not found.', 404);
    if (!department) throw new AppError('Department not found.', 404);

    const link = await prisma.complaintDepartment.upsert({
      where: {
        complaintId_departmentId: {
          complaintId: id,
          departmentId,
        },
      },
      update: { relationshipType },
      create: {
        complaintId: id,
        departmentId,
        relationshipType,
        addedByUserId: req.user!.id,
      },
    });

    await logAuditEvent({
      actorUserId: req.user?.id,
      action: 'COLLABORATOR_ADDED',
      entityType: 'COMPLAINT',
      entityId: id,
      newValues: { departmentId, relationshipType },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      data: link,
      message: `${department.name} added as collaborating department.`,
    });
  } catch (error) {
    next(error);
  }
}

export async function resolveComplaint(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { resolutionSummary } = z.object({
      resolutionSummary: z.string().min(15, 'Resolution findings summary must be at least 15 characters'),
    }).parse(req.body);

    const complaint = await prisma.complaint.findUnique({ where: { id } });
    if (!complaint) throw new AppError('Complaint not found.', 404);

    if (complaint.status !== ComplaintStatus.IN_PROGRESS && complaint.status !== ComplaintStatus.AWAITING_INFORMATION) {
      throw new AppError(`Cannot resolve complaint currently in state ${complaint.status}. Must be IN_PROGRESS.`, 400);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const resComp = await tx.complaint.update({
        where: { id },
        data: {
          status: ComplaintStatus.RESOLVED,
          resolvedAt: new Date(),
          resolutionSummary,
        },
      });

      await logAuditEvent(
        {
          actorUserId: req.user?.id,
          action: 'COMPLAINT_RESOLVED',
          entityType: 'COMPLAINT',
          entityId: id,
          newValues: { status: 'RESOLVED', resolutionSummary },
          ipAddress: req.ip,
        },
        tx
      );

      return resComp;
    });

    res.status(200).json({
      success: true,
      data: updated,
      message: 'Complaint resolved successfully.',
    });
  } catch (error) {
    next(error);
  }
}

export async function closeComplaint(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { closureReason } = z.object({
      closureReason: z.string().min(5, 'Closure reason is mandatory'),
    }).parse(req.body);

    const complaint = await prisma.complaint.findUnique({ where: { id } });
    if (!complaint) throw new AppError('Complaint not found.', 404);

    if (complaint.status !== ComplaintStatus.RESOLVED) {
      throw new AppError('Only resolved complaints can be formally closed.', 400);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const resComp = await tx.complaint.update({
        where: { id },
        data: {
          status: ComplaintStatus.CLOSED,
          closedAt: new Date(),
          closureReason,
        },
      });

      await logAuditEvent(
        {
          actorUserId: req.user?.id,
          action: 'COMPLAINT_CLOSED',
          entityType: 'COMPLAINT',
          entityId: id,
          newValues: { status: 'CLOSED', closureReason },
          reason: closureReason,
          ipAddress: req.ip,
        },
        tx
      );

      return resComp;
    });

    res.status(200).json({
      success: true,
      data: updated,
      message: 'Complaint closed successfully.',
    });
  } catch (error) {
    next(error);
  }
}

export async function reopenComplaint(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { reopenReason } = z.object({
      reopenReason: z.string().min(10, 'Reopen justification must be at least 10 characters'),
    }).parse(req.body);

    const complaint = await prisma.complaint.findUnique({ where: { id } });
    if (!complaint) throw new AppError('Complaint not found.', 404);

    if (complaint.status !== ComplaintStatus.RESOLVED && complaint.status !== ComplaintStatus.CLOSED) {
      throw new AppError('Only resolved or closed complaints can be reopened.', 400);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const resComp = await tx.complaint.update({
        where: { id },
        data: {
          status: ComplaintStatus.REOPENED,
          reopenReason,
        },
      });

      await logAuditEvent(
        {
          actorUserId: req.user?.id,
          action: 'COMPLAINT_REOPENED',
          entityType: 'COMPLAINT',
          entityId: id,
          newValues: { status: 'REOPENED', reopenReason },
          reason: reopenReason,
          ipAddress: req.ip,
        },
        tx
      );

      return resComp;
    });

    res.status(200).json({
      success: true,
      data: updated,
      message: 'Complaint reopened for investigation.',
    });
  } catch (error) {
    next(error);
  }
}

export async function getComplaintHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const [auditLogs, assignments] = await Promise.all([
      prisma.auditLog.findMany({
        where: { entityType: 'COMPLAINT', entityId: id },
        include: { actor: { select: { id: true, fullName: true, role: { select: { name: true } } } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.complaintAssignment.findMany({
        where: { complaintId: id },
        include: {
          department: true,
          officer: { select: { id: true, fullName: true } },
          assignedBy: { select: { id: true, fullName: true } },
        },
        orderBy: { startedAt: 'desc' },
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        auditLogs,
        assignments,
      },
    });
  } catch (error) {
    next(error);
  }
}
