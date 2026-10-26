const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.complaint.count();
  const sample = await prisma.complaint.findFirst({
    select: {
      complaintNumber: true,
      title: true,
      status: true,
      priority: true,
      institution: { select: { institutionName: true, state: true } },
      assignedDepartment: { select: { name: true } },
    },
  });

  console.log('--- DIRECT POSTGRESQL DATABASE QUERY ---');
  console.log('Total Complaints Stored in Database:', count);
  console.log('Sample Record from PostgreSQL:', JSON.stringify(sample, null, 2));
}

main().finally(() => prisma.$disconnect());
