import crypto from 'crypto';
import { prisma } from '../config/index.js';

export async function generateUniqueComplaintNumber(): Promise<string> {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  let isUnique = false;
  let complaintNumber = '';

  // Max 5 attempts in case of collision
  for (let attempt = 0; attempt < 5; attempt++) {
    const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 chars
    complaintNumber = `CMP-${dateStr}-${randomSuffix}`;

    const existing = await prisma.complaint.findUnique({
      where: { complaintNumber },
      select: { id: true },
    });

    if (!existing) {
      isUnique = true;
      break;
    }
  }

  if (!isUnique) {
    // Fallback to high-entropy timestamp suffix
    const fallbackSuffix = `${Date.now().toString().slice(-6)}`;
    complaintNumber = `CMP-${dateStr}-${fallbackSuffix}`;
  }

  return complaintNumber;
}
