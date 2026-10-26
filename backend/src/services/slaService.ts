import { Priority } from '@prisma/client';
import { prisma } from '../config/index.js';

export async function calculateComplaintDueAt(categoryId: string, priority: Priority): Promise<Date> {
  const policy = await prisma.slaPolicy.findFirst({
    where: {
      categoryId,
      priority,
      isActive: true,
    },
  });

  let resolutionHours = 360; // 15 days default
  if (policy) {
    resolutionHours = policy.resolutionHours;
  } else {
    // Fallback standards based on priority
    switch (priority) {
      case Priority.CRITICAL:
        resolutionHours = 72; // 3 days
        break;
      case Priority.HIGH:
        resolutionHours = 168; // 7 days
        break;
      case Priority.MEDIUM:
        resolutionHours = 360; // 15 days
        break;
      case Priority.LOW:
        resolutionHours = 720; // 30 days
        break;
    }
  }

  const dueAt = new Date();
  dueAt.setHours(dueAt.getHours() + resolutionHours);
  return dueAt;
}
