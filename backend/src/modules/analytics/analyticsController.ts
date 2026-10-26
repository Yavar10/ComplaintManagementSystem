import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/index.js';
import { ComplaintStatus, ReviewStatus } from '@prisma/client';

export async function getOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const departmentId = req.query.departmentId as string || (
      req.user?.role === 'DEPARTMENT_HEAD' || req.user?.role === 'COMPLAINT_OFFICER'
        ? req.user.departmentId
        : undefined
    );

    const baseWhere: any = {};
    if (departmentId) {
      baseWhere.assignedDepartmentId = departmentId;
    }

    const now = new Date();

    const [
      total,
      open,
      inProgress,
      overdue,
      resolved,
      closed,
      pendingDuplicates,
    ] = await Promise.all([
      prisma.complaint.count({ where: baseWhere }),
      prisma.complaint.count({
        where: {
          ...baseWhere,
          status: { in: [ComplaintStatus.SUBMITTED, ComplaintStatus.UNDER_REVIEW, ComplaintStatus.ASSIGNED] },
        },
      }),
      prisma.complaint.count({
        where: {
          ...baseWhere,
          status: { in: [ComplaintStatus.IN_PROGRESS, ComplaintStatus.AWAITING_INFORMATION] },
        },
      }),
      prisma.complaint.count({
        where: {
          ...baseWhere,
          dueAt: { lt: now },
          status: { notIn: [ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED, ComplaintStatus.REJECTED] },
        },
      }),
      prisma.complaint.count({
        where: {
          ...baseWhere,
          status: ComplaintStatus.RESOLVED,
        },
      }),
      prisma.complaint.count({
        where: {
          ...baseWhere,
          status: ComplaintStatus.CLOSED,
        },
      }),
      prisma.complaintRelationship.count({
        where: { status: ReviewStatus.PENDING },
      }),
    ]);

    // Calculate SLA compliance rate
    const totalResolved = resolved + closed;
    let complianceRate = 100;
    if (totalResolved > 0) {
      const onTimeResolved = await prisma.complaint.count({
        where: {
          ...baseWhere,
          status: { in: [ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED] },
          resolvedAt: { not: null },
          dueAt: { not: null },
          // resolvedAt <= dueAt
        },
      });
      complianceRate = Math.round((onTimeResolved / totalResolved) * 100);
    }

    res.status(200).json({
      success: true,
      data: {
        totalComplaints: total,
        openComplaints: open,
        inProgressComplaints: inProgress,
        overdueComplaints: overdue,
        resolvedComplaints: resolved,
        closedComplaints: closed,
        pendingDuplicates,
        complianceRate,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getComplaintsByStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const counts = await prisma.complaint.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const data = counts.map((c) => ({
      status: c.status,
      count: c._count.id,
    }));

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getComplaintsByDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const departments = await prisma.department.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        code: true,
        _count: {
          select: { assignedComplaints: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const data = departments.map((d) => ({
      id: d.id,
      name: d.name,
      code: d.code,
      count: d._count.assignedComplaints,
    }));

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getComplaintsByCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const categories = await prisma.complaintCategory.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        code: true,
        _count: {
          select: { complaints: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const data = categories.map((c) => ({
      id: c.id,
      name: c.name,
      code: c.code,
      count: c._count.complaints,
    }));

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getInstitutionTrends(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const institutions = await prisma.institution.findMany({
      where: { isActive: true },
      select: {
        id: true,
        institutionName: true,
        institutionCode: true,
        state: true,
        _count: {
          select: { complaints: true },
        },
      },
      orderBy: {
        complaints: { _count: 'desc' },
      },
      take: 10,
    });

    const data = institutions.map((i) => ({
      id: i.id,
      name: i.institutionName,
      code: i.institutionCode,
      state: i.state,
      complaintCount: i._count.complaints,
    }));

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getSlaPerformance(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const resolvedComplaints = await prisma.complaint.findMany({
      where: {
        status: { in: [ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED] },
        resolvedAt: { not: null },
      },
      select: {
        submittedAt: true,
        resolvedAt: true,
        dueAt: true,
        priority: true,
      },
    });

    let totalHours = 0;
    let compliantCount = 0;

    for (const c of resolvedComplaints) {
      if (c.resolvedAt) {
        const diffMs = c.resolvedAt.getTime() - c.submittedAt.getTime();
        totalHours += diffMs / (1000 * 60 * 60);

        if (c.dueAt && c.resolvedAt <= c.dueAt) {
          compliantCount++;
        }
      }
    }

    const count = resolvedComplaints.length;
    const avgResolutionHours = count > 0 ? Math.round((totalHours / count) * 10) / 10 : 0;
    const slaCompliancePercent = count > 0 ? Math.round((compliantCount / count) * 100) : 100;

    res.status(200).json({
      success: true,
      data: {
        totalResolvedCases: count,
        avgResolutionHours,
        slaCompliancePercent,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function exportComplaintsCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const complaints = await prisma.complaint.findMany({
      include: {
        category: true,
        institution: true,
        assignedDepartment: true,
        assignedOfficer: true,
      },
      orderBy: { submittedAt: 'desc' },
      take: 1000,
    });

    const headers = [
      'Complaint Number',
      'Title',
      'Status',
      'Priority',
      'Category',
      'Institution Name',
      'Institution Code',
      'State',
      'Assigned Department',
      'Assigned Officer',
      'Submitted At',
      'Due At',
      'Resolved At',
    ];

    const escapeCsv = (str: string | null | undefined) => {
      if (!str) return '""';
      return `"${str.replace(/"/g, '""').replace(/\n/g, ' ')}"`;
    };

    const rows = complaints.map((c) => [
      escapeCsv(c.complaintNumber),
      escapeCsv(c.title),
      escapeCsv(c.status),
      escapeCsv(c.priority),
      escapeCsv(c.category?.name),
      escapeCsv(c.institution?.institutionName),
      escapeCsv(c.institution?.institutionCode),
      escapeCsv(c.institution?.state),
      escapeCsv(c.assignedDepartment?.name),
      escapeCsv(c.assignedOfficer?.fullName),
      escapeCsv(c.submittedAt.toISOString()),
      escapeCsv(c.dueAt?.toISOString() || ''),
      escapeCsv(c.resolvedAt?.toISOString() || ''),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="regulatory_complaints_export.csv"');
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
}
