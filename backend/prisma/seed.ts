import { PrismaClient, Priority, ComplaintStatus, AssignmentType, DepartmentRelationType, ReviewStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Starting database seeding...');

  // 1. Roles
  const rolesData = [
    { name: 'SYSTEM_ADMIN', description: 'Full system administrator with user, department, and policy privileges' },
    { name: 'ADMINISTRATOR', description: 'Regulatory administrator managing intake, assignment, duplicate review, and institutional compliance' },
    { name: 'DEPARTMENT_HEAD', description: 'Head of regulatory division overseeing departmental caseload and officer assignments' },
    { name: 'COMPLAINT_OFFICER', description: 'Assigned investigator handling case evidence, internal notes, and resolution proposals' },
    { name: 'READ_ONLY_AUDITOR', description: 'Independent auditor with read-only inspection of cases, analytics, and audit logs' },
  ];

  const roleMap: Record<string, string> = {};
  for (const r of rolesData) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description },
      create: r,
    });
    roleMap[r.name] = role.id;
  }
  console.log('[Seed] Roles created/updated.');

  // 2. Permissions
  const permissionsData = [
    { name: 'USERS_MANAGE', description: 'Create and update users and roles' },
    { name: 'DEPARTMENTS_MANAGE', description: 'Configure regulatory departments' },
    { name: 'INSTITUTIONS_MANAGE', description: 'Register and update institutions' },
    { name: 'COMPLAINTS_CREATE', description: 'Submit new complaints into registry' },
    { name: 'COMPLAINTS_VIEW_ALL', description: 'View complaints across all departments' },
    { name: 'COMPLAINTS_VIEW_DEPT', description: 'View departmental complaints' },
    { name: 'COMPLAINTS_ASSIGN', description: 'Assign or reassign complaints to officers' },
    { name: 'COMPLAINTS_TRANSFER', description: 'Transfer complaints between departments' },
    { name: 'COMPLAINTS_TRANSITION', description: 'Update complaint workflow status' },
    { name: 'COMPLAINTS_RESOLVE', description: 'Record findings and submit resolution' },
    { name: 'COMPLAINTS_CLOSE', description: 'Execute final regulatory closure' },
    { name: 'COMPLAINTS_REOPEN', description: 'Reopen resolved complaint' },
    { name: 'DUPLICATES_REVIEW', description: 'Confirm or dismiss candidate duplicate complaints' },
    { name: 'ANALYTICS_VIEW', description: 'Access institutional analytics and CSV export' },
    { name: 'AUDIT_VIEW', description: 'View system audit trails' },
  ];

  for (const p of permissionsData) {
    await prisma.permission.upsert({
      where: { name: p.name },
      update: { description: p.description },
      create: p,
    });
  }

  // 3. Departments
  const departmentsData = [
    { name: 'Academic Compliance', code: 'ACAD', description: 'Curriculum adherence, examination conduct, and university affiliation norms' },
    { name: 'Faculty & Staffing', code: 'FAC', description: 'Cadre ratio violations, ghost faculty, pay scale disputes, and qualification verification' },
    { name: 'Infrastructure & Facilities', code: 'INFRA', description: 'Laboratory equipment, building safety, library holdings, and campus land norms' },
    { name: 'Finance & Administration', code: 'FIN', description: 'Capitation fee complaints, illegal fee extortion, and financial embezzlement' },
    { name: 'Student Grievances', code: 'GRIEV', description: 'Harassment, ragging, withholding certificates, and victimisation allegations' },
    { name: 'General Regulatory Affairs', code: 'REG', description: 'Statutory approvals, unapproved technical programmes, and misrepresentation' },
  ];

  const deptMap: Record<string, string> = {};
  for (const d of departmentsData) {
    const dept = await prisma.department.upsert({
      where: { code: d.code },
      update: { name: d.name, description: d.description },
      create: d,
    });
    deptMap[d.code] = dept.id;
  }
  console.log('[Seed] Departments created/updated.');

  // 4. Complaint Categories
  const categoriesData = [
    { name: 'Faculty Shortage & Ghost Faculty', code: 'FAC_SHORT', description: 'Severe shortage of qualified teaching faculty, non-payment of AICTE scale salaries' },
    { name: 'Infrastructure & Lab Deficiencies', code: 'INFRA_DEF', description: 'Non-functional labs, lacking safety equipment, inadequate computer terminals' },
    { name: 'Academic Non-Compliance', code: 'ACAD_NONCOMP', description: 'Running unapproved courses, improper exam evaluation, deviation from syllabus' },
    { name: 'Student Grievance & Harassment', code: 'STUD_GRIEV', description: 'Mental harassment by college administration, withholding of original mark sheets' },
    { name: 'Fee Irregularities & Extortion', code: 'FIN_IRREG', description: 'Demanding capitation fees, charging unapproved laboratory and sports fees' },
    { name: 'Accreditation & Documentation Misrepresentation', code: 'REG_DOC', description: 'False claims regarding NBA/NAAC accreditation in prospectus' },
    { name: 'Other Grievances', code: 'OTHER', description: 'Miscellaneous operational grievances' },
  ];

  const categoryMap: Record<string, string> = {};
  for (const c of categoriesData) {
    const cat = await prisma.complaintCategory.upsert({
      where: { code: c.code },
      update: { name: c.name, description: c.description },
      create: c,
    });
    categoryMap[c.code] = cat.id;
  }
  console.log('[Seed] Complaint categories created/updated.');

  // 5. Institutions
  const institutionsData = [
    {
      institutionName: 'Apex Institute of Engineering & Technology',
      institutionCode: 'INST-DEL-101',
      institutionType: 'ENGINEERING',
      state: 'Delhi',
      district: 'South West Delhi',
      address: 'Plot 12, Institutional Area, Vasant Kunj, New Delhi - 110070',
      contactEmail: 'registrar@apexinstitute.edu.in',
      contactPhone: '+91 11 2612 8890',
    },
    {
      institutionName: 'National College of Technology & Management',
      institutionCode: 'INST-MAH-204',
      institutionType: 'MANAGEMENT',
      state: 'Maharashtra',
      district: 'Pune',
      address: 'Survey No. 45, Hinjawadi Phase 2, Pune - 411057',
      contactEmail: 'director@nctm-pune.ac.in',
      contactPhone: '+91 20 2293 4500',
    },
    {
      institutionName: 'Vivekananda Institute of Science & Technology',
      institutionCode: 'INST-KA-312',
      institutionType: 'ENGINEERING',
      state: 'Karnataka',
      district: 'Bengaluru Urban',
      address: 'Outer Ring Road, Marathahalli, Bengaluru - 560037',
      contactEmail: 'info@vist.edu',
      contactPhone: '+91 80 4123 9900',
    },
    {
      institutionName: 'Heritage Polytechnic & Vocational College',
      institutionCode: 'INST-TN-415',
      institutionType: 'POLYTECHNIC',
      state: 'Tamil Nadu',
      district: 'Chennai',
      address: 'GST Road, Tambaram, Chennai - 600045',
      contactEmail: 'principal@heritagepolytechnic.edu.in',
      contactPhone: '+91 44 2226 7711',
    },
    {
      institutionName: 'Greater Noida Institute of Applied Sciences',
      institutionCode: 'INST-UP-520',
      institutionType: 'ENGINEERING',
      state: 'Uttar Pradesh',
      district: 'Gautam Buddha Nagar',
      address: 'Knowledge Park II, Greater Noida - 201310',
      contactEmail: 'compliance@gnias.ac.in',
      contactPhone: '+91 120 232 4001',
    },
    {
      institutionName: 'Royal Institute of Pharmacy & Bio-Tech',
      institutionCode: 'INST-GUJ-625',
      institutionType: 'PHARMACY',
      state: 'Gujarat',
      district: 'Ahmedabad',
      address: 'SG Highway, Bodakdev, Ahmedabad - 380054',
      contactEmail: 'admin@royalpharmacy.ac.in',
      contactPhone: '+91 79 2685 1122',
    },
  ];

  const instMap: Record<string, string> = {};
  for (const inst of institutionsData) {
    const record = await prisma.institution.upsert({
      where: { institutionCode: inst.institutionCode },
      update: inst,
      create: inst,
    });
    instMap[inst.institutionCode] = record.id;
  }
  console.log('[Seed] Sample institutions created/updated.');

  // 6. Demo Users
  const passwordHash = await bcrypt.hash('Password@123', 10);

  const usersData = [
    {
      fullName: 'Dr. Ramesh Sharma (System Admin)',
      email: 'sysadmin@aicte.gov.in',
      passwordHash,
      roleId: roleMap['SYSTEM_ADMIN'],
      departmentId: null,
    },
    {
      fullName: 'Priya Narayanan (Administrator)',
      email: 'admin@aicte.gov.in',
      passwordHash,
      roleId: roleMap['ADMINISTRATOR'],
      departmentId: null,
    },
    {
      fullName: 'Prof. Anand Verma (Academic Head)',
      email: 'head.academic@aicte.gov.in',
      passwordHash,
      roleId: roleMap['DEPARTMENT_HEAD'],
      departmentId: deptMap['ACAD'],
    },
    {
      fullName: 'Dr. Sunita Kulkarni (Faculty Head)',
      email: 'head.faculty@aicte.gov.in',
      passwordHash,
      roleId: roleMap['DEPARTMENT_HEAD'],
      departmentId: deptMap['FAC'],
    },
    {
      fullName: 'Vikram Sethi (Academic Officer)',
      email: 'officer.academic@aicte.gov.in',
      passwordHash,
      roleId: roleMap['COMPLAINT_OFFICER'],
      departmentId: deptMap['ACAD'],
    },
    {
      fullName: 'Ananya Roy (Faculty Officer)',
      email: 'officer.faculty@aicte.gov.in',
      passwordHash,
      roleId: roleMap['COMPLAINT_OFFICER'],
      departmentId: deptMap['FAC'],
    },
    {
      fullName: 'Justice Rajesh Gupta (Auditor)',
      email: 'auditor@aicte.gov.in',
      passwordHash,
      roleId: roleMap['READ_ONLY_AUDITOR'],
      departmentId: null,
    },
  ];

  const userMap: Record<string, string> = {};
  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        fullName: u.fullName,
        passwordHash: u.passwordHash,
        roleId: u.roleId,
        departmentId: u.departmentId,
      },
      create: u,
    });
    userMap[u.email] = user.id;
  }
  console.log('[Seed] Demo accounts created with password "Password@123".');

  // 7. SLA Policies
  const priorities: Priority[] = [Priority.CRITICAL, Priority.HIGH, Priority.MEDIUM, Priority.LOW];
  for (const prio of priorities) {
    let firstResp = 48;
    let resolHours = 360;
    if (prio === Priority.CRITICAL) {
      firstResp = 12;
      resolHours = 72; // 3 days
    } else if (prio === Priority.HIGH) {
      firstResp = 24;
      resolHours = 168; // 7 days
    } else if (prio === Priority.MEDIUM) {
      firstResp = 48;
      resolHours = 360; // 15 days
    } else if (prio === Priority.LOW) {
      firstResp = 72;
      resolHours = 720; // 30 days
    }

    await prisma.slaPolicy.upsert({
      where: {
        categoryId_priority: {
          categoryId: categoryMap['FAC_SHORT'],
          priority: prio,
        },
      },
      update: { firstResponseHours: firstResp, resolutionHours: resolHours },
      create: {
        categoryId: categoryMap['FAC_SHORT'],
        priority: prio,
        firstResponseHours: firstResp,
        resolutionHours: resolHours,
        escalationThresholdHours: 24,
      },
    });
  }
  console.log('[Seed] SLA policies seeded.');

  // 8. Sample Complaints
  // Check if complaints exist; if not, populate realistic cases
  const existingComplaintsCount = await prisma.complaint.count();
  if (existingComplaintsCount === 0) {
    console.log('[Seed] Seeding sample complaints...');

    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
    const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
    const futureDue = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
    const pastDue = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

    // Complaint 1: Severe Faculty Shortage (ASSIGNED)
    const c1 = await prisma.complaint.create({
      data: {
        complaintNumber: 'CMP-20261020-00101',
        title: 'Massive shortage of qualified CSE professors and ghost faculty during inspection',
        description: 'The Computer Science and Engineering department has only 3 permanent assistant professors for 480 enrolled students. During the recent AICTE extension of approval inspection, external guest lecturers were falsely registered as full-time PhD professors.',
        categoryId: categoryMap['FAC_SHORT'],
        priority: Priority.HIGH,
        status: ComplaintStatus.ASSIGNED,
        institutionId: instMap['INST-DEL-101'],
        submittedByUserId: userMap['admin@aicte.gov.in'],
        assignedDepartmentId: deptMap['FAC'],
        assignedOfficerId: userMap['officer.faculty@aicte.gov.in'],
        submittedAt: tenDaysAgo,
        dueAt: futureDue,
      },
    });

    // Assignment history for C1
    await prisma.complaintAssignment.create({
      data: {
        complaintId: c1.id,
        departmentId: deptMap['FAC'],
        officerId: userMap['officer.faculty@aicte.gov.in'],
        assignedByUserId: userMap['head.faculty@aicte.gov.in'],
        assignmentType: AssignmentType.INITIAL,
        reason: 'Urgent investigation into cadre ratio and biometric attendance logs',
        startedAt: tenDaysAgo,
      },
    });

    // Notes for C1
    await prisma.complaintComment.create({
      data: {
        complaintId: c1.id,
        authorUserId: userMap['officer.faculty@aicte.gov.in'],
        content: 'Issued formal requisition letter to Registrar for salary slips and EPFO contribution records for all 18 listed faculty members.',
      },
    });

    // Complaint 2: Overdue Infrastructure Deficiency (IN_PROGRESS, OVERDUE)
    const c2 = await prisma.complaint.create({
      data: {
        complaintNumber: 'CMP-20261010-00204',
        title: 'Hazardous chemistry and mechanical workshops operating without ventilation or fire clearance',
        description: 'The central mechanical workshop and chemistry labs lack basic exhaust hoods, eyewash stations, and fire exits. Multiple students suffered chemical fume inhalation during fluid mechanics practicals.',
        categoryId: categoryMap['INFRA_DEF'],
        priority: Priority.CRITICAL,
        status: ComplaintStatus.IN_PROGRESS,
        institutionId: instMap['INST-MAH-204'],
        submittedByUserId: userMap['admin@aicte.gov.in'],
        assignedDepartmentId: deptMap['INFRA'],
        assignedOfficerId: null,
        submittedAt: fifteenDaysAgo,
        dueAt: pastDue, // Overdue!
      },
    });

    // Multi-department collaboration for C2
    await prisma.complaintDepartment.create({
      data: {
        complaintId: c2.id,
        departmentId: deptMap['INFRA'],
        relationshipType: DepartmentRelationType.PRIMARY,
        addedByUserId: userMap['admin@aicte.gov.in'],
      },
    });
    await prisma.complaintDepartment.create({
      data: {
        complaintId: c2.id,
        departmentId: deptMap['GRIEV'],
        relationshipType: DepartmentRelationType.COLLABORATING,
        addedByUserId: userMap['admin@aicte.gov.in'],
      },
    });

    // Complaint 3: Near-duplicate of Complaint 1 (SUBMITTED) - Candidate for duplicate review!
    const c3 = await prisma.complaint.create({
      data: {
        complaintNumber: 'CMP-20261025-00312',
        title: 'Severe shortage of CSE professors and fake faculty in Apex Institute',
        description: 'Apex Institute CSE department has fewer than 4 teachers for nearly 500 students. Fake faculty names and dummy PhD profiles were submitted during AICTE approval verification.',
        categoryId: categoryMap['FAC_SHORT'],
        priority: Priority.HIGH,
        status: ComplaintStatus.SUBMITTED,
        institutionId: instMap['INST-DEL-101'], // Same institution!
        submittedByUserId: null,
        submittedAt: threeDaysAgo,
        dueAt: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
      },
    });

    // Relationship link between C1 and C3
    await prisma.complaintRelationship.create({
      data: {
        complaintId: c1.id,
        relatedComplaintId: c3.id,
        relationshipType: 'POSSIBLE_DUPLICATE',
        similarityScore: 0.86,
        detectionMethod: 'HEURISTIC_TFIDF',
        status: ReviewStatus.PENDING,
      },
    });

    // Complaint 4: Capitation Fee Extortion (RESOLVED)
    const c4 = await prisma.complaint.create({
      data: {
        complaintNumber: 'CMP-20261005-00450',
        title: 'Demand for illegal development fees and certificate retention upon graduation',
        description: 'Administration demanding Rs. 75,000 extra development charges beyond State Fee Regulatory Committee ceilings before handing over B.Tech degree certificates.',
        categoryId: categoryMap['FIN_IRREG'],
        priority: Priority.MEDIUM,
        status: ComplaintStatus.RESOLVED,
        institutionId: instMap['INST-KA-312'],
        submittedByUserId: userMap['admin@aicte.gov.in'],
        assignedDepartmentId: deptMap['FIN'],
        assignedOfficerId: null,
        submittedAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
        dueAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        resolvedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        resolutionSummary: 'Institutional inquiry conducted. Management ordered to refund illegal charges to 32 complainant students and release all original certificates within 48 hours. Compliance affidavit submitted by college management.',
      },
    });

    // Sample Notification for officer
    await prisma.notification.create({
      data: {
        recipientUserId: userMap['officer.faculty@aicte.gov.in'],
        complaintId: c1.id,
        type: 'ASSIGNMENT',
        title: 'New Case Assigned: CMP-20261020-00101',
        message: 'You have been assigned to investigate severe faculty shortage at Apex Institute of Engineering.',
        createdAt: tenDaysAgo,
      },
    });

    // Overdue alert notification for c2
    await prisma.notification.create({
      data: {
        recipientUserId: userMap['admin@aicte.gov.in'],
        complaintId: c2.id,
        type: 'OVERDUE_ESCALATION',
        title: 'Overdue Complaint Escalation: CMP-20261010-00204',
        message: 'CRITICAL priority complaint regarding hazardous workshop conditions at National College of Technology has breached resolution deadline.',
        createdAt: pastDue,
      },
    });

    // Initial Audit Logs
    await prisma.auditLog.create({
      data: {
        actorUserId: userMap['admin@aicte.gov.in'],
        action: 'COMPLAINT_CREATED',
        entityType: 'COMPLAINT',
        entityId: c1.id,
        newValues: { complaintNumber: c1.complaintNumber, priority: 'HIGH', institution: 'Apex Institute' },
        createdAt: tenDaysAgo,
      },
    });
    await prisma.auditLog.create({
      data: {
        actorUserId: userMap['head.faculty@aicte.gov.in'],
        action: 'OFFICER_ASSIGNED',
        entityType: 'COMPLAINT',
        entityId: c1.id,
        newValues: { officerId: userMap['officer.faculty@aicte.gov.in'] },
        createdAt: tenDaysAgo,
      },
    });

    console.log('[Seed] Sample complaints and relationships created.');
  }

  console.log('[Seed] Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('[Seed Error]:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
