import { Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middlewares/authenticate';
import { Role } from '@prisma/client';

export const createSubmission = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { title, description, type, category, department, location, severity, isAnonymous } = req.body;
    
    let attachmentPath = null;
    if (req.file) {
      attachmentPath = `/uploads/${req.file.filename}`;
    }

    const currentYear = new Date().getFullYear();

    const lastSubmission = await prisma.submission.findFirst({
      where: {
        trackingId: {
          startsWith: `NEO-${currentYear}-`,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    let nextNumber = 1;
    if (lastSubmission && lastSubmission.trackingId) {
      const parts = lastSubmission.trackingId.split('-');
      if (parts.length === 3) {
        const lastNumber = parseInt(parts[2], 10);
        if (!isNaN(lastNumber)) {
          nextNumber = lastNumber + 1;
        }
      }
    }

    const trackingId = `NEO-${currentYear}-${nextNumber.toString().padStart(3, '0')}`;

    const submission = await prisma.submission.create({
      data: {
        trackingId,
        title,
        description,
        type,
        category,
        department,
        location,
        severity,
        attachment: attachmentPath,
        isAnonymous: typeof isAnonymous === 'string' ? isAnonymous === 'true' : (isAnonymous ?? false),
        submittedById: (typeof isAnonymous === 'string' ? isAnonymous === 'true' : isAnonymous) ? undefined : req.user!.id,
      },
    });

    res.status(201).json({ success: true, data: submission });
  } catch (err) {
    next(err);
  }
};

export const getSubmissions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const isAdminOrSecretariat = ([Role.ADMIN, Role.SECRETARIAT] as Role[]).includes(req.user!.role as Role);

    let whereClause = {};

    if (!isAdminOrSecretariat) {
      if (req.user!.role === Role.CASE_MANAGER) {
        whereClause = { assignedToId: req.user!.id };
      } else {
        whereClause = { submittedById: req.user!.id };
      }
    }

    const submissions = await prisma.submission.findMany({
      where: whereClause,
      include: {
        submittedBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: submissions });
  } catch (err) {
    next(err);
  }
};

export const getSubmissionById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const submission = await prisma.submission.findUnique({
      where: { id: req.params.id },
      include: {
        submittedBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        comments: {
          include: { author: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!submission) {
      res.status(404).json({ success: false, message: 'Submission not found' });
      return;
    }

    res.json({ success: true, data: submission });
  } catch (err) {
    next(err);
  }
};

export const updateSubmission = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { status, severity, assignedToId } = req.body;
    const userRole = req.user!.role as Role;

    const isAdminOrSecretariat = ([Role.ADMIN, Role.SECRETARIAT] as Role[]).includes(userRole);
    const isCaseManager = userRole === Role.CASE_MANAGER;

    if (!isAdminOrSecretariat && !isCaseManager) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }

    if (assignedToId && isAdminOrSecretariat) {
      const assignee = await prisma.user.findUnique({ where: { id: assignedToId } });
      if (!assignee || assignee.role !== Role.CASE_MANAGER) {
        res.status(400).json({ success: false, message: 'Can only assign to a Case Manager' });
        return;
      }
    } else if (assignedToId && !isAdminOrSecretariat) {
      res.status(403).json({ success: false, message: 'Only Secretariat can assign cases' });
      return;
    }

    const updated = await prisma.submission.update({
      where: { id: req.params.id },
      data: { 
        ...(status && { status }), 
        ...(severity && { severity }), 
        ...(assignedToId && { assignedToId }) 
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

export const deleteSubmission = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (req.user!.role !== Role.ADMIN) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }

    await prisma.submission.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Submission deleted' });
  } catch (err) {
    next(err);
  }
};
