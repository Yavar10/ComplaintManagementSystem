import { ComplaintStatus } from '@prisma/client';
import { AppError } from '../../middleware/errorHandler.js';

export const ALLOWED_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  SUBMITTED: [ComplaintStatus.UNDER_REVIEW, ComplaintStatus.REJECTED, ComplaintStatus.ASSIGNED],
  UNDER_REVIEW: [ComplaintStatus.ASSIGNED, ComplaintStatus.REJECTED, ComplaintStatus.IN_PROGRESS],
  ASSIGNED: [ComplaintStatus.IN_PROGRESS, ComplaintStatus.ASSIGNED, ComplaintStatus.REJECTED],
  IN_PROGRESS: [
    ComplaintStatus.AWAITING_INFORMATION,
    ComplaintStatus.RESOLVED,
    ComplaintStatus.ASSIGNED, // Reassign
  ],
  AWAITING_INFORMATION: [ComplaintStatus.IN_PROGRESS, ComplaintStatus.RESOLVED],
  RESOLVED: [ComplaintStatus.CLOSED, ComplaintStatus.REOPENED],
  REOPENED: [ComplaintStatus.IN_PROGRESS, ComplaintStatus.ASSIGNED],
  REJECTED: [], // Terminal
  CLOSED: [],   // Terminal
};

export function validateStatusTransition(currentStatus: ComplaintStatus, targetStatus: ComplaintStatus): void {
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(targetStatus)) {
    throw new AppError(
      `Invalid status transition from ${currentStatus} to ${targetStatus}. Allowed next states: ${allowed.join(', ') || 'None (Terminal state)'}`,
      400
    );
  }
}
