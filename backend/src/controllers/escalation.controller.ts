import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { Status } from '@prisma/client';

export const escalateStaleSubmissions = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Escalate submissions not resolved or already escalated, older than 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const staleSubmissions = await prisma.submission.findMany({
      where: {
        status: {
          notIn: [Status.RESOLVED, Status.ESCALATED],
        },
        updatedAt: {
          lt: sevenDaysAgo,
        },
      },
    });

    if (staleSubmissions.length > 0) {
      await prisma.submission.updateMany({
        where: {
          id: {
            in: staleSubmissions.map((sub) => sub.id),
          },
        },
        data: {
          status: Status.ESCALATED,
        },
      });

      console.log(`[Escalation] Escalated ${staleSubmissions.length} stale submissions.`);
    }

    res.json({ success: true, escalatedCount: staleSubmissions.length });
  } catch (err) {
    next(err);
  }
};
