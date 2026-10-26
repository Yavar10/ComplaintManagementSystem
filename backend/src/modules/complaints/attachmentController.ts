import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { prisma, config } from '../../config/index.js';
import { AppError } from '../../middleware/errorHandler.js';
import { logAuditEvent } from '../../services/auditService.js';

// Ensure upload directory exists
if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const key = `${crypto.randomUUID()}${ext}`;
    cb(null, key);
  },
});

const allowedMimeTypes = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);

export const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (allowedMimeTypes.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('Disallowed file type. Allowed: PDF, JPEG, PNG, DOCX, TXT', 400));
    }
  },
});

export async function uploadAttachment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    if (!req.file) {
      throw new AppError('No file uploaded.', 400);
    }

    const complaint = await prisma.complaint.findUnique({ where: { id } });
    if (!complaint) {
      // Clean up orphaned uploaded file
      fs.unlinkSync(req.file.path);
      throw new AppError('Complaint not found.', 404);
    }

    const attachment = await prisma.complaintAttachment.create({
      data: {
        complaintId: id,
        uploadedByUserId: req.user!.id,
        originalFilename: req.file.originalname,
        storageKey: req.file.filename,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
      },
      include: {
        uploadedBy: { select: { id: true, fullName: true } },
      },
    });

    await logAuditEvent({
      actorUserId: req.user?.id,
      action: 'ATTACHMENT_UPLOADED',
      entityType: 'COMPLAINT',
      entityId: id,
      newValues: { filename: attachment.originalFilename, size: attachment.fileSize },
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      data: attachment,
      message: 'File uploaded successfully.',
    });
  } catch (error) {
    next(error);
  }
}

export async function downloadAttachment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const attachment = await prisma.complaintAttachment.findUnique({
      where: { id },
      include: { complaint: true },
    });

    if (!attachment) {
      throw new AppError('Attachment not found.', 404);
    }

    // Role check for access
    if (
      (req.user?.role === 'DEPARTMENT_HEAD' || req.user?.role === 'COMPLAINT_OFFICER') &&
      req.user.departmentId
    ) {
      if (
        attachment.complaint.assignedDepartmentId !== req.user.departmentId &&
        attachment.complaint.assignedOfficerId !== req.user.id
      ) {
        throw new AppError('Access denied to evidence outside your jurisdiction.', 403);
      }
    }

    const filePath = path.resolve(config.uploadDir, attachment.storageKey);
    if (!fs.existsSync(filePath)) {
      throw new AppError('Evidence file missing from disk repository.', 404);
    }

    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${attachment.originalFilename}"`);
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    next(error);
  }
}
