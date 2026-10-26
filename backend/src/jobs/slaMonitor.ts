import { prisma, config } from '../config/index.js';
import { ComplaintStatus } from '@prisma/client';

export async function checkSlaDeadlines(): Promise<{ warningsEmitted: number; overduesEmitted: number }> {
  let warningsEmitted = 0;
  let overduesEmitted = 0;

  try {
    const now = new Date();
    const warningHorizon = new Date(now.getTime() + 24 * 60 * 60 * 1000); // within next 24h

    // Retrieve active complaints with a dueAt deadline
    const activeComplaints = await prisma.complaint.findMany({
      where: {
        status: {
          notIn: [ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED, ComplaintStatus.REJECTED],
        },
        dueAt: { not: null },
      },
      include: {
        assignedDepartment: {
          include: {
            users: {
              where: { role: { name: 'DEPARTMENT_HEAD' }, isActive: true },
            },
          },
        },
        assignedOfficer: true,
      },
    });

    for (const comp of activeComplaints) {
      if (!comp.dueAt) continue;

      const isOverdue = now >= comp.dueAt;
      const isApproaching = !isOverdue && comp.dueAt <= warningHorizon;

      // 1. Overdue Escalation
      if (isOverdue) {
        // Check if an overdue alert was already created in the last 24 hours
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const existingAlert = await prisma.notification.findFirst({
          where: {
            complaintId: comp.id,
            type: 'OVERDUE_ESCALATION',
            createdAt: { gte: twentyFourHoursAgo },
          },
        });

        if (!existingAlert) {
          // Notify assigned officer if present
          if (comp.assignedOfficerId) {
            await prisma.notification.create({
              data: {
                recipientUserId: comp.assignedOfficerId,
                complaintId: comp.id,
                type: 'OVERDUE_ESCALATION',
                title: `OVERDUE ALERT: ${comp.complaintNumber}`,
                message: `Case "${comp.title}" has breached its SLA deadline. Immediate action is required.`,
              },
            });
            overduesEmitted++;
          }

          // Escalate to Department Head(s)
          const deptHeads = comp.assignedDepartment?.users || [];
          for (const head of deptHeads) {
            await prisma.notification.create({
              data: {
                recipientUserId: head.id,
                complaintId: comp.id,
                type: 'OVERDUE_ESCALATION',
                title: `OVERDUE ESCALATION: ${comp.complaintNumber}`,
                message: `Case "${comp.title}" in your department has breached its SLA deadline.`,
              },
            });
            overduesEmitted++;
          }
        }
      }
      // 2. Approaching Deadline Warning
      else if (isApproaching && comp.assignedOfficerId) {
        const existingWarning = await prisma.notification.findFirst({
          where: {
            complaintId: comp.id,
            recipientUserId: comp.assignedOfficerId,
            type: 'DEADLINE_WARNING',
            createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
          },
        });

        if (!existingWarning) {
          const hoursLeft = Math.max(1, Math.round((comp.dueAt.getTime() - now.getTime()) / (1000 * 60 * 60)));
          await prisma.notification.create({
            data: {
              recipientUserId: comp.assignedOfficerId,
              complaintId: comp.id,
              type: 'DEADLINE_WARNING',
              title: `Deadline Approaching: ${comp.complaintNumber}`,
              message: `Case "${comp.title}" is due in approximately ${hoursLeft} hours.`,
            },
          });
          warningsEmitted++;
        }
      }
    }
  } catch (err) {
    console.error('[SLA Monitor Error]:', err);
  }

  return { warningsEmitted, overduesEmitted };
}

let slaTimer: NodeJS.Timeout | null = null;

export function startSlaJob(): void {
  console.log(`[SLA Monitor] Initialized. Running check every ${config.slaCheckIntervalMinutes} minutes.`);
  // Run once on bootstrap
  checkSlaDeadlines().then((res) => {
    if (res.warningsEmitted > 0 || res.overduesEmitted > 0) {
      console.log(`[SLA Monitor] Initial scan: ${res.warningsEmitted} warnings, ${res.overduesEmitted} overdues issued.`);
    }
  });

  const intervalMs = config.slaCheckIntervalMinutes * 60 * 1000;
  slaTimer = setInterval(() => {
    checkSlaDeadlines();
  }, intervalMs);
}

export function stopSlaJob(): void {
  if (slaTimer) {
    clearInterval(slaTimer);
    slaTimer = null;
  }
}
