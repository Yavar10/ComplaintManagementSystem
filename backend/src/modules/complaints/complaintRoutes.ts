import { Router } from 'express';
import {
  listComplaints,
  getComplaintById,
  createComplaint,
  transitionComplaint,
  assignComplaint,
  transferComplaint,
  addCollaboratingDepartment,
  resolveComplaint,
  closeComplaint,
  reopenComplaint,
  getComplaintHistory,
} from './complaintController.js';
import {
  uploadMiddleware,
  uploadAttachment,
  downloadAttachment,
} from './attachmentController.js';
import {
  addComment,
  listComments,
} from './commentController.js';
import {
  getRelatedForComplaint,
  triggerDetection,
  listAllRelationships,
  reviewRelationship,
} from './duplicateController.js';
import {
  authenticate,
  authorizeRoles,
  restrictAuditorModifications,
} from '../../middleware/auth.js';

export const complaintRouter = Router();

complaintRouter.use(authenticate);
complaintRouter.use(restrictAuditorModifications);

// Core complaint registry
complaintRouter.get('/', listComplaints);
complaintRouter.post('/', createComplaint);
complaintRouter.get('/:id', getComplaintById);
complaintRouter.get('/:id/history', getComplaintHistory);

// Transitions and assignments
complaintRouter.post('/:id/transition', transitionComplaint);
complaintRouter.post('/:id/assign', assignComplaint);
complaintRouter.post('/:id/assignments', assignComplaint);
complaintRouter.post('/:id/transfer', transferComplaint);
complaintRouter.post('/:id/collaborators', addCollaboratingDepartment);
complaintRouter.post('/:id/resolve', resolveComplaint);
complaintRouter.post('/:id/close', authorizeRoles('SYSTEM_ADMIN', 'ADMINISTRATOR'), closeComplaint);
complaintRouter.post('/:id/reopen', authorizeRoles('SYSTEM_ADMIN', 'ADMINISTRATOR'), reopenComplaint);

// Investigation notes
complaintRouter.get('/:id/comments', listComments);
complaintRouter.post('/:id/comments', addComment);

// Evidence attachments
complaintRouter.post('/:id/attachments', uploadMiddleware.single('file'), uploadAttachment);
complaintRouter.get('/:id/attachments', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { prisma } = await import('../../config/index.js');
    const attachments = await prisma.complaintAttachment.findMany({
      where: { complaintId: id },
      include: { uploadedBy: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json({ success: true, data: attachments });
  } catch (error) {
    next(error);
  }
});

// Duplicate and relationship reviews
complaintRouter.get('/:id/related', getRelatedForComplaint);
complaintRouter.post('/:id/detect-related', triggerDetection);

// Relationship review endpoint
export const relationshipRouter = Router();
relationshipRouter.use(authenticate);
relationshipRouter.use(restrictAuditorModifications);
relationshipRouter.get('/', listAllRelationships);
relationshipRouter.post('/:id/review', authorizeRoles('SYSTEM_ADMIN', 'ADMINISTRATOR', 'DEPARTMENT_HEAD'), reviewRelationship);

// Attachment download router
export const attachmentRouter = Router();
attachmentRouter.use(authenticate);
attachmentRouter.get('/:id/download', downloadAttachment);
