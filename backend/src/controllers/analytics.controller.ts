import { Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middlewares/authenticate';
import { Role, Status } from '@prisma/client';

export const getAnalytics = async (
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

    // 1. Group by Status
    const byStatus = await prisma.submission.groupBy({
      by: ['status'],
      _count: {
        _all: true,
      },
    });

    // 2. Group by Category
    const byCategory = await prisma.submission.groupBy({
      by: ['category'],
      _count: {
        _all: true,
      },
    });

    // 3. Group by Department
    const byDepartment = await prisma.submission.groupBy({
      by: ['department'],
      _count: {
        _all: true,
      },
    });

    // 4. Open Cases per Department (for heatmaps/bar charts)
    // Assuming "Open" means anything NOT Resolved/Closed
    const openCasesByDepartment = await prisma.submission.groupBy({
      by: ['department'],
      where: {
        status: {
          notIn: [Status.RESOLVED], 
        },
      },
      _count: {
        _all: true,
      },
      orderBy: {
        _count: {
          department: 'desc',
        },
      },
    });

    // 5. Hotspot Flagging Algorithm
    // Group by both Department AND Category, and count where total >= 5
    const departmentCategoryCombos = await prisma.submission.groupBy({
      by: ['department', 'category'],
      _count: {
        _all: true,
      },
    });

    const hotspots = departmentCategoryCombos
      .filter((combo) => combo._count._all >= 5)
      .map((combo) => ({
        department: combo.department,
        category: combo.category,
        count: combo._count._all,
      }));

    res.json({
      success: true,
      data: {
        byStatus: byStatus.map((s) => ({ status: s.status, count: s._count._all })),
        byCategory: byCategory.map((c) => ({ category: c.category, count: c._count._all })),
        byDepartment: byDepartment.map((d) => ({ department: d.department, count: d._count._all })),
        openCasesByDepartment: openCasesByDepartment.map((d) => ({
          department: d.department,
          count: d._count._all,
        })),
        hotspots,
      },
    });
  } catch (err) {
    next(err);
  }
};
