import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const THIRTY_DAYS_MS = 1000 * 60 * 60 * 24 * 30;

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const thirtyDaysAgo = new Date(Date.now() - THIRTY_DAYS_MS);

    const [activeUsers, revenue, courseCount, averageProgress, visits] =
      await Promise.all([
        this.prisma.user.count({
          where: {
            enrollments: {
              some: {
                status: 'ACTIVE',
              },
            },
          },
        }),
        this.prisma.courseEnrollment.aggregate({
          _sum: {
            pricePaid: true,
          },
          where: {
            paymentStatus: 'PAID',
          },
        }),
        this.prisma.course.count({
          where: {
            isPublished: true,
          },
        }),
        this.prisma.courseProgress.aggregate({
          _avg: {
            progressPercent: true,
          },
        }),
        this.prisma.activityLog.count({
          where: {
            createdAt: {
              gte: thirtyDaysAgo,
            },
          },
        }),
      ]);

    return {
      activeUsers,
      revenueCents: revenue._sum.pricePaid ?? 0,
      courseCount,
      averageProgressPercent:
        Math.round((averageProgress._avg.progressPercent ?? 0) * 10) / 10,
      visitsLast30Days: visits,
    };
  }

  async getTopCourses() {
    const courses = await this.prisma.course.findMany({
      where: { isPublished: true },
      select: {
        id: true,
        title: true,
        slug: true,
        priceAmount: true,
        priceCurrency: true,
        isFree: true,
        _count: {
          select: {
            enrollments: true,
            reviews: true,
          },
        },
        enrollments: {
          select: {
            pricePaid: true,
          },
        },
      },
      orderBy: {
        enrollments: {
          _count: Prisma.SortOrder.desc,
        },
      },
      take: 5,
    });

    return courses.map((course) => ({
      id: course.id,
      title: course.title,
      slug: course.slug,
      enrollments: course._count.enrollments,
      reviews: course._count.reviews,
      revenueCents: course.enrollments.reduce(
        (acc, enrollment) => acc + (enrollment.pricePaid ?? 0),
        0,
      ),
      priceAmount: course.priceAmount,
      priceCurrency: course.priceCurrency,
      isFree: course.isFree,
    }));
  }

  async getRecentActivity() {
    const logs = await this.prisma.activityLog.findMany({
      orderBy: { createdAt: Prisma.SortOrder.desc },
      take: 10,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            username: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
    });

    return logs.map((log) => ({
      id: log.id,
      action: log.action,
      createdAt: log.createdAt,
      metadata: log.metadata,
      actor: log.user
        ? {
            id: log.user.id,
            name: log.user.firstName ?? log.user.username ?? log.user.id,
          }
        : null,
      course: log.course
        ? {
            id: log.course.id,
            title: log.course.title,
            slug: log.course.slug,
          }
        : null,
    }));
  }
}

