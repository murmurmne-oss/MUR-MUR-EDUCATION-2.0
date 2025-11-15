import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ActivityActorType,
  LessonProgressStatus,
  Prisma,
  ReminderFrequency,
  ReminderTimeOfDay,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type UserEnrollmentDto = {
  id: string;
  status: string;
  accessType: string;
  course: {
    id: string;
    slug: string;
    title: string;
    shortDescription: string | null;
    coverImageUrl: string | null;
    category: string;
    isFree: boolean;
    priceAmount: number | null;
    priceCurrency: string | null;
  };
  progress: {
    totalLessons: number;
    completedLessons: number;
    percent: number;
    nextLessonTitle: string | null;
  };
  lastViewedAt: Date | null;
  activatedAt: Date | null;
  lessonProgress: Array<{
    lessonId: string;
    status: LessonProgressStatus;
    progressPercent: number;
    lastViewedAt: Date | null;
    completedAt: Date | null;
  }>;
};

export type ReminderSettingDto = {
  frequency: ReminderFrequency;
  timeOfDay: ReminderTimeOfDay;
  isEnabled: boolean;
} | null;

export type ReminderInput = {
  frequency: ReminderFrequency;
  timeOfDay: ReminderTimeOfDay;
  isEnabled: boolean;
};

export type ProgressUpdateInput =
  | {
      courseId: string;
      action: 'complete' | 'reset';
    }
  | {
      courseId: string;
      lessonId: string;
      action: 'lesson';
      status?: LessonProgressStatus;
      progressPercent?: number;
    };

export type SyncUserInput = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  languageCode?: string | null;
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        reminderSetting: true,
        enrollments: {
          select: {
            status: true,
          },
        },
      },
    });

    return users.map((user) => {
      const activeEnrollments = user.enrollments.filter(
        (enrollment) => enrollment.status === 'ACTIVE',
      ).length;

      return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        avatarUrl: user.avatarUrl,
        languageCode: user.languageCode,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt,
        lastSeenAt: user.lastSeenAt,
        timezone: user.timezone,
        coursesCount: user.enrollments.length,
        activeCourses: activeEnrollments,
        reminder: user.reminderSetting
          ? {
              frequency: user.reminderSetting.frequency,
              timeOfDay: user.reminderSetting.timeOfDay,
              isEnabled: user.reminderSetting.isEnabled,
            }
          : null,
      };
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        reminderSetting: true,
        enrollments: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                slug: true,
                category: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    return user;
  }

  async findEnrollments(userId: string): Promise<{
    enrollments: UserEnrollmentDto[];
    reminder: ReminderSettingDto;
  }> {
    const enrollments = await this.prisma.courseEnrollment.findMany({
      where: { userId },
      orderBy: { createdAt: Prisma.SortOrder.desc },
      include: {
        course: {
          select: {
            id: true,
            slug: true,
            title: true,
            shortDescription: true,
            coverImageUrl: true,
            category: true,
            isFree: true,
            priceAmount: true,
            priceCurrency: true,
            modules: {
              orderBy: { order: Prisma.SortOrder.asc },
              select: {
                id: true,
                order: true,
                lessons: {
                  orderBy: { order: Prisma.SortOrder.asc },
                  select: {
                    id: true,
                    title: true,
                    order: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const reminder = await this.prisma.reminderSetting.findUnique({
      where: { userId },
    });

    const enrollmentsWithProgress: UserEnrollmentDto[] = [];

    for (const enrollment of enrollments) {
      const lessons = enrollment.course.modules.flatMap((module) =>
        module.lessons.map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          order: lesson.order + module.order / 1000,
        })),
      );

      lessons.sort((a, b) => a.order - b.order);

      const progress = await this.prisma.courseProgress.findMany({
        where: {
          userId,
          lesson: {
            module: {
              courseId: enrollment.courseId,
            },
          },
        },
        select: {
          lessonId: true,
          status: true,
          progressPercent: true,
          lastViewedAt: true,
          completedAt: true,
        },
        orderBy: { lastViewedAt: Prisma.SortOrder.desc },
      });

      const totalLessons = lessons.length;
      const completedLessons = progress.filter(
        (item) => item.status === LessonProgressStatus.COMPLETED,
      ).length;
      const percent =
        totalLessons === 0
          ? 0
          : Math.round((completedLessons / totalLessons) * 100);

      const completedLessonIds = new Set(
        progress
          .filter((item) => item.status === LessonProgressStatus.COMPLETED)
          .map((item) => item.lessonId),
      );

      const nextLesson = lessons.find(
        (lesson) => !completedLessonIds.has(lesson.id),
      );

      const progressMap = new Map(
        progress.map((item) => [item.lessonId, item]),
      );

      enrollmentsWithProgress.push({
        id: enrollment.id,
        status: enrollment.status,
        accessType: enrollment.accessType,
        course: {
          id: enrollment.course.id,
          slug: enrollment.course.slug,
          title: enrollment.course.title,
          shortDescription: enrollment.course.shortDescription,
          coverImageUrl: enrollment.course.coverImageUrl,
          category: enrollment.course.category,
          isFree: enrollment.course.isFree,
          priceAmount: enrollment.course.priceAmount,
          priceCurrency: enrollment.course.priceCurrency,
        },
        progress: {
          totalLessons,
          completedLessons,
          percent,
          nextLessonTitle: nextLesson?.title ?? null,
        },
        lastViewedAt: progress[0]?.lastViewedAt ?? null,
        activatedAt: enrollment.activatedAt,
        lessonProgress: lessons.map((lesson) => {
          const lessonProgress = progressMap.get(lesson.id);
          return {
            lessonId: lesson.id,
            status: lessonProgress?.status ?? LessonProgressStatus.NOT_STARTED,
            progressPercent: lessonProgress?.progressPercent ?? 0,
            lastViewedAt: lessonProgress?.lastViewedAt ?? null,
            completedAt: lessonProgress?.completedAt ?? null,
          };
        }),
      });
    }

    return {
      enrollments: enrollmentsWithProgress,
      reminder: reminder
        ? {
            frequency: reminder.frequency,
            timeOfDay: reminder.timeOfDay,
            isEnabled: reminder.isEnabled,
          }
        : null,
    };
  }

  async updateReminder(userId: string, input: ReminderInput) {
    await this.ensureUserExists(userId);

    return this.prisma.reminderSetting.upsert({
      where: { userId },
      update: {
        frequency: input.frequency,
        timeOfDay: input.timeOfDay,
        isEnabled: input.isEnabled,
      },
      create: {
        userId,
        frequency: input.frequency,
        timeOfDay: input.timeOfDay,
        isEnabled: input.isEnabled,
      },
    });
  }

  async updateCourseProgress(userId: string, input: ProgressUpdateInput) {
    await this.ensureUserExists(userId);

    if (input.action === 'lesson') {
      const lesson = await this.prisma.lesson.findFirst({
        where: {
          id: input.lessonId,
          module: {
            courseId: input.courseId,
          },
        },
        select: {
          id: true,
          module: {
            select: {
              courseId: true,
            },
          },
        },
      });

      if (!lesson) {
        throw new NotFoundException(
          `Lesson ${input.lessonId} not found in course ${input.courseId}`,
        );
      }

      const enrollment = await this.prisma.courseEnrollment.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId: lesson.module.courseId,
          },
        },
        select: {
          id: true,
        },
      });

      if (!enrollment) {
        throw new BadRequestException(
          'User does not have access to this course',
        );
      }

      const now = new Date();
      const desiredStatus =
        input.status ?? LessonProgressStatus.IN_PROGRESS;
      const clampedPercent = Math.min(
        100,
        Math.max(
          0,
          input.progressPercent ??
            (desiredStatus === LessonProgressStatus.COMPLETED ? 100 : 0),
        ),
      );
      const shouldComplete =
        desiredStatus === LessonProgressStatus.COMPLETED ||
        clampedPercent === 100;
      const targetStatus = shouldComplete
        ? LessonProgressStatus.COMPLETED
        : desiredStatus;
      const targetPercent = shouldComplete ? 100 : clampedPercent;

      const existingProgress = await this.prisma.courseProgress.findUnique({
        where: {
          userId_lessonId: {
            userId,
            lessonId: lesson.id,
          },
        },
        select: {
          startedAt: true,
          completedAt: true,
        },
      });

      const startedAt =
        targetStatus === LessonProgressStatus.NOT_STARTED
          ? null
          : existingProgress?.startedAt ?? now;
      const completedAt = shouldComplete
        ? now
        : targetStatus === LessonProgressStatus.NOT_STARTED
          ? null
          : existingProgress?.completedAt ?? null;

      await this.prisma.courseProgress.upsert({
        where: {
          userId_lessonId: {
            userId,
            lessonId: lesson.id,
          },
        },
        update: {
          status: targetStatus,
          progressPercent: targetPercent,
          startedAt,
          completedAt,
          lastViewedAt: now,
        },
        create: {
          userId,
          lessonId: lesson.id,
          status: targetStatus,
          progressPercent: targetPercent,
          startedAt,
          completedAt,
          lastViewedAt: now,
        },
      });

      await this.prisma.activityLog.create({
        data: {
          actorId: userId,
          actorType: ActivityActorType.USER,
          action: 'course.lesson.progress',
          metadata: {
            courseId: lesson.module.courseId,
            lessonId: lesson.id,
            status: targetStatus,
            progressPercent: targetPercent,
          },
          courseId: lesson.module.courseId,
        },
      });

      return {
        status: 'lesson',
        lesson: {
          lessonId: lesson.id,
          status: targetStatus,
          progressPercent: targetPercent,
          startedAt,
          completedAt,
        },
      };
    }

    const course = await this.prisma.course.findUnique({
      where: { id: input.courseId },
      include: {
        modules: {
          select: {
            lessons: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException(`Course ${input.courseId} not found`);
    }

    if (input.action === 'reset') {
      await this.prisma.courseProgress.deleteMany({
        where: {
          userId,
          lesson: {
            module: {
              courseId: course.id,
            },
          },
        },
      });

      await this.prisma.activityLog.create({
        data: {
          actorType: ActivityActorType.ADMIN,
          action: 'admin.progress.reset',
          metadata: {
            userId,
            courseId: course.id,
          },
        },
      });

      return { status: 'reset' };
    }

    if (input.action === 'complete') {
      const lessonIds = course.modules.flatMap((module) =>
        module.lessons.map((lesson) => lesson.id),
      );

      if (lessonIds.length === 0) {
        return { status: 'complete', lessonsUpdated: 0 };
      }

      const now = new Date();
      await this.prisma.$transaction(
        lessonIds.map((lessonId) =>
          this.prisma.courseProgress.upsert({
            where: {
              userId_lessonId: {
                userId,
                lessonId,
              },
            },
            update: {
              status: LessonProgressStatus.COMPLETED,
              progressPercent: 100,
              startedAt: now,
              completedAt: now,
              lastViewedAt: now,
            },
            create: {
              userId,
              lessonId,
              status: LessonProgressStatus.COMPLETED,
              progressPercent: 100,
              startedAt: now,
              completedAt: now,
              lastViewedAt: now,
            },
          }),
        ),
      );

      await this.prisma.activityLog.create({
        data: {
          actorType: ActivityActorType.ADMIN,
          action: 'admin.progress.complete',
          metadata: {
            userId,
            courseId: course.id,
            lessonsUpdated: lessonIds.length,
          },
        },
      });

      return { status: 'complete', lessonsUpdated: lessonIds.length };
    }

    throw new BadRequestException('Unsupported progress action');
  }

  private async ensureUserExists(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }
  }

  async syncUser(input: SyncUserInput) {
    if (!input.id) {
      throw new BadRequestException('User id is required');
    }

    const updateData: Prisma.UserUpdateInput = {
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      username: input.username ?? null,
      avatarUrl: input.avatarUrl ?? null,
    };

    if (Object.prototype.hasOwnProperty.call(input, 'languageCode')) {
      updateData.languageCode = input.languageCode ?? null;
    }

    const user = await this.prisma.user.upsert({
      where: { id: input.id },
      update: updateData,
      create: {
        id: input.id,
        firstName: input.firstName ?? null,
        lastName: input.lastName ?? null,
        username: input.username ?? null,
        avatarUrl: input.avatarUrl ?? null,
        languageCode:
          input.languageCode === undefined || input.languageCode === null
            ? 'sr'
            : input.languageCode,
      },
    });

    return user;
  }
}
