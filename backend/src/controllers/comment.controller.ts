import { Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middlewares/authenticate';
import { Role } from '@prisma/client';

export const addComment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { submissionId } = req.params;
    const { body } = req.body;

    // Only allow Case Managers, Secretariat and Admins to add comments
    const userRole = req.user!.role as Role;
    if (!([Role.CASE_MANAGER, Role.SECRETARIAT, Role.ADMIN] as Role[]).includes(userRole)) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
    });

    if (!submission) {
      res.status(404).json({ success: false, message: 'Submission not found' });
      return;
    }

    // Optional: restrict CASE_MANAGER to only their assigned submissions
    if (userRole === Role.CASE_MANAGER && submission.assignedToId !== req.user!.id) {
      res.status(403).json({ success: false, message: 'Not assigned to this submission' });
      return;
    }

    const comment = await prisma.comment.create({
      data: {
        body,
        submissionId: submission.id,
        authorId: req.user!.id,
      },
    });

    res.status(201).json({ success: true, data: comment });
  } catch (err) {
    next(err);
  }
};
