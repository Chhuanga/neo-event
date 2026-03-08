import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { Status, Role } from '@prisma/client';
import { AuthRequest } from '../middlewares/authenticate';

// 1. Get resolved cases for Digest & Impact Tracking Table
export const getResolvedCases = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const resolvedCases = await prisma.submission.findMany({
      where: {
        status: Status.RESOLVED,
      },
      select: {
        id: true,
        trackingId: true,
        title: true,
        description: true,
        category: true,
        department: true,
        createdAt: true,
        updatedAt: true,
        // Include comments to show 'Action taken' / 'What changed' if needed
        comments: {
          orderBy: { createdAt: 'asc' },
          select: { body: true, createdAt: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ success: true, data: resolvedCases });
  } catch (err) {
    next(err);
  }
};

// 2. Upload a new meeting minute (Secretariat/Admin only)
export const uploadMeetingMinute = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userRole = req.user!.role as Role;
    if (!([Role.ADMIN, Role.SECRETARIAT] as Role[]).includes(userRole)) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }

    const { title } = req.body;
    if (!title || !req.file) {
      res.status(400).json({ success: false, message: 'Title and file (PDF) are required' });
      return;
    }

    const fileUrl = `/uploads/${req.file.filename}`;

    const meetingMinute = await prisma.meetingMinute.create({
      data: {
        title,
        fileUrl,
      },
    });

    res.status(201).json({ success: true, data: meetingMinute });
  } catch (err) {
    next(err);
  }
};

// 3. Get all meeting minutes (Visible to all staff)
export const getMeetingMinutes = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const minutes = await prisma.meetingMinute.findMany({
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: minutes });
  } catch (err) {
    next(err);
  }
};
