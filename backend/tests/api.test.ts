import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/config/index.js';

describe('SIH26264 Regulatory API Integration Test Suite', () => {
  let adminToken: string;
  let officerToken: string;
  let auditorToken: string;
  let testInstitutionId: string;
  let testCategoryId: string;
  let testComplaintId: string;

  beforeAll(async () => {
    // 1. Authenticate Admin
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@aicte.gov.in', password: 'Password@123' });
    expect(adminRes.status).toBe(200);
    adminToken = adminRes.body.data.token;

    // 2. Authenticate Officer
    const officerRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'officer.academic@aicte.gov.in', password: 'Password@123' });
    expect(officerRes.status).toBe(200);
    officerToken = officerRes.body.data.token;

    // 3. Authenticate Auditor
    const auditorRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'auditor@aicte.gov.in', password: 'Password@123' });
    expect(auditorRes.status).toBe(200);
    auditorToken = auditorRes.body.data.token;

    // Retrieve sample IDs
    const inst = await prisma.institution.findFirst();
    testInstitutionId = inst!.id;
    const cat = await prisma.complaintCategory.findFirst();
    testCategoryId = cat!.id;
  });

  describe('1. Health & Perimeter Security', () => {
    it('GET /api/v1/health returns status UP and database CONNECTED', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('UP');
      expect(res.body.database).toBe('CONNECTED');
    });

    it('rejects unauthenticated requests to protected endpoints with 401', async () => {
      const res = await request(app).get('/api/v1/complaints');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects invalid login credentials with 401', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@aicte.gov.in', password: 'WrongPassword' });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('2. Authorization Boundaries & Role Constraints', () => {
    it('officer cannot access administrative user management endpoint (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${officerToken}`)
        .send({
          fullName: 'Test User',
          email: 'test@aicte.gov.in',
          password: 'Password@123',
          roleId: '00000000-0000-0000-0000-000000000000',
        });
      expect(res.status).toBe(403);
    });

    it('read-only auditor cannot create or mutate complaints (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/v1/complaints')
        .set('Authorization', `Bearer ${auditorToken}`)
        .send({
          title: 'Auditor Attempted Creation',
          description: 'This must be blocked by the server-side auditor guard',
          categoryId: testCategoryId,
          institutionId: testInstitutionId,
          priority: 'MEDIUM',
        });
      expect(res.status).toBe(403);
    });
  });

  describe('3. Complaint Lifecycle & State Machine', () => {
    it('creates a complaint with unique complaint number format and SUBMITTED status', async () => {
      const res = await request(app)
        .post('/api/v1/complaints')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Infrastructure Deficiencies in Electrical Engineering Labs',
          description: 'Transformer coils in the high-voltage electrical machine laboratory are sparking and lack earthing protection.',
          categoryId: testCategoryId,
          institutionId: testInstitutionId,
          priority: 'HIGH',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.complaintNumber).toMatch(/^CMP-\d{8}-[A-F0-9]{6}$/);
      expect(res.body.data.status).toBe('SUBMITTED');
      testComplaintId = res.body.data.id;
    });

    it('rejects illegal status transition (e.g. SUBMITTED directly to RESOLVED)', async () => {
      const res = await request(app)
        .post(`/api/v1/complaints/${testComplaintId}/transition`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          targetStatus: 'RESOLVED',
          reason: 'Attempting invalid shortcut',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Invalid status transition');
    });

    it('validates transition to UNDER_REVIEW then ASSIGNED', async () => {
      const t1 = await request(app)
        .post(`/api/v1/complaints/${testComplaintId}/transition`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ targetStatus: 'UNDER_REVIEW' });
      expect(t1.status).toBe(200);
      expect(t1.body.data.status).toBe('UNDER_REVIEW');

      // Now assign
      const dept = await prisma.department.findFirst();
      const assignRes = await request(app)
        .post(`/api/v1/complaints/${testComplaintId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          departmentId: dept!.id,
          reason: 'Initial assignment to engineering department',
        });
      expect(assignRes.status).toBe(200);
      expect(assignRes.body.data.status).toBe('ASSIGNED');
    });

    it('transitions to IN_PROGRESS and adds an investigation note', async () => {
      const t = await request(app)
        .post(`/api/v1/complaints/${testComplaintId}/transition`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ targetStatus: 'IN_PROGRESS' });
      expect(t.status).toBe(200);

      const noteRes = await request(app)
        .post(`/api/v1/complaints/${testComplaintId}/comments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ content: 'Dispatched state inspection team to verify lab safety compliance.' });
      expect(noteRes.status).toBe(201);
      expect(noteRes.body.data.content).toContain('inspection team');
    });

    it('resolves complaint requiring findings summary', async () => {
      const failRes = await request(app)
        .post(`/api/v1/complaints/${testComplaintId}/resolve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ resolutionSummary: 'short' }); // under 15 chars
      expect(failRes.status).toBe(400);

      const successRes = await request(app)
        .post(`/api/v1/complaints/${testComplaintId}/resolve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          resolutionSummary: 'High-voltage lab inspected. Faulty transformer replaced, earthing pit tested, and electrical safety certificate verified.',
        });
      expect(successRes.status).toBe(200);
      expect(successRes.body.data.status).toBe('RESOLVED');
    });
  });

  describe('4. Explainable Duplicate Detection', () => {
    it('detects candidate related complaints with similarity scores', async () => {
      const res = await request(app)
        .post(`/api/v1/complaints/${testComplaintId}/detect-related`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('can review candidate duplicate without deleting or merging either case', async () => {
      // Find an existing pending relationship
      const rel = await prisma.complaintRelationship.findFirst();
      if (rel) {
        const reviewRes = await request(app)
          .post(`/api/v1/complaint-relationships/${rel.id}/review`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            action: 'CONFIRMED',
            reviewNotes: 'Verified duplicate submitted by student council regarding the same incident.',
          });

        expect(reviewRes.status).toBe(200);
        expect(reviewRes.body.data.status).toBe('CONFIRMED');

        // Confirm both complaints still exist independently in database!
        const [source, target] = await Promise.all([
          prisma.complaint.findUnique({ where: { id: rel.complaintId } }),
          prisma.complaint.findUnique({ where: { id: rel.relatedComplaintId } }),
        ]);
        expect(source).not.toBeNull();
        expect(target).not.toBeNull();
      }
    });
  });

  describe('5. Real-Time Analytics & CSV Export', () => {
    it('GET /api/v1/analytics/overview returns valid numeric KPIs', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/overview')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.totalComplaints).toBeGreaterThan(0);
      expect(typeof res.body.data.complianceRate).toBe('number');
    });

    it('GET /api/v1/analytics/export returns CSV content', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/export')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.header['content-type']).toContain('text/csv');
      expect(res.text).toContain('Complaint Number,Title,Status');
    });
  });
});
