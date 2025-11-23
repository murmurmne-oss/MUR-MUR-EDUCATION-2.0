import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import {
  ActivityActorType,
  CourseAccessCodeStatus,
  CourseAccessStatus,
  CourseAccessType,
  CourseCategory,
  CourseLanguage,
  CourseLevel,
  Currency,
  LessonContentType,
  LessonProgressStatus,
  Prisma,
  TestAttemptStatus,
  FormAttemptStatus,
  FormType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type LessonInput = {
  id?: string;
  title: string;
  summary?: string | null;
  content?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
  contentType?: LessonContentType;
  videoUrl?: string | null;
  durationMinutes?: number | null;
  order: number;
  isPreview?: boolean;
};

export type CourseModuleInput = {
  id?: string;
  title: string;
  description?: string | null;
  order: number;
  lessons?: LessonInput[];
};

export type CourseTestInput = {
  title: string;
  description?: string | null;
  questions?: Prisma.InputJsonValue | null;
  unlockModuleId?: string | null;
  unlockLessonId?: string | null;
};

export type CourseFormInput = {
  title: string;
  description?: string | null;
  type?: "CHOICE" | "RATING";
  maxRating?: number | null;
  questions?: Prisma.InputJsonValue | null;
  results?: Prisma.InputJsonValue | null;
  lessonId?: string | null;
  unlockModuleId?: string | null;
  unlockLessonId?: string | null;
};

export type CourseInput = {
  title: string;
  slug: string;
  shortDescription?: string | null;
  description?: string | null;
  coverImageUrl?: string | null;
  promoVideoUrl?: string | null;
  category: CourseCategory;
  language: CourseLanguage;
  level?: CourseLevel;
  priceAmount: number;
  priceCurrency: Currency;
  isFree: boolean;
  isPublished: boolean;
  modules?: CourseModuleInput[];
  tests?: CourseTestInput[];
  forms?: CourseFormInput[];
};

export type EnrollCourseInput = {
  userId: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  languageCode?: string | null;
  avatarUrl?: string | null;
};

export type GenerateAccessCodeInput = {
  note?: string | null;
  createdBy?: string | null;
};

export type RedeemAccessCodeInput = EnrollCourseInput & {
  code: string;
};

type StoredTestQuestion =
  | {
      type: 'single' | 'multiple';
      prompt: string;
      options: Array<{
        text: string;
        isCorrect: boolean;
      }>;
      explanation?: string;
    }
  | {
      type: 'open';
      prompt: string;
      explanation?: string;
      correctAnswer?: string;
    };

export type PublicTestQuestionOption = {
  id: string;
  text: string;
};

export type PublicTestQuestion = {
  id: string;
  order: number;
  type: 'single' | 'multiple' | 'open';
  prompt: string;
  explanation?: string;
  options?: PublicTestQuestionOption[];
};

export type PublicTest = {
  id: string;
  title: string;
  description: string | null;
  questionCount: number;
  maxScore: number;
  questions: PublicTestQuestion[];
  unlockLesson?: {
    id: string;
    title: string;
  };
  unlockModule?: {
    id: string;
    title: string;
  };
};

export type StartTestInput = {
  userId: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  languageCode?: string | null;
  avatarUrl?: string | null;
};

export type SubmitTestAnswer = {
  questionId: string;
  selectedOptionIds?: string[];
  textAnswer?: string;
};

export type SubmitTestInput = {
  attemptId: string;
  answers: SubmitTestAnswer[];
};

export type TestAnswerEvaluation = {
  questionId: string;
  correct: boolean | null;
  selectedOptionIds?: string[];
  correctOptionIds?: string[];
  textAnswer?: string;
  expectedAnswer?: string | null;
  explanation?: string | null;
};

export type SubmitTestResult = {
  attemptId: string;
  score: number;
  maxScore: number;
  percent: number;
  answers: TestAnswerEvaluation[];
};

export type PublicFormQuestionOption = {
  id: string;
  text: string;
  category: string; // A, B, C и т.д.
};

export type PublicFormQuestion = {
  id: string;
  order: number;
  text: string;
  options: PublicFormQuestionOption[];
};

export type PublicForm = {
  id: string;
  title: string;
  description: string | null;
  type: "CHOICE" | "RATING";
  maxRating: number | null;
  questionCount: number;
  questions: PublicFormQuestion[];
  unlockLesson?: {
    id: string;
    title: string;
  };
  unlockModule?: {
    id: string;
    title: string;
  };
};

export type StartFormInput = {
  userId: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  languageCode?: string | null;
  avatarUrl?: string | null;
};

export type SubmitFormInput = {
  attemptId: string;
  responses: Record<string, string | string[]>; // questionId -> selected optionId(s)
};

export type SubmitFormResult = {
  attemptId: string;
  resultId?: string;
  result?: {
    id: string;
    title: string;
    description?: string;
  };
};

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.course.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            modules: true,
            enrollments: true,
          },
        },
      },
      take: 100,
    });
  }

  async findOne(idOrSlug: string, userId?: string) {
    const course = await this.prisma.course.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        modules: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                title: true,
                summary: true,
                content: true,
                order: true,
                durationMinutes: true,
                contentType: true,
                isPreview: true,
                videoUrl: true,
              },
            },
          },
        },
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        tests: {
          orderBy: { createdAt: 'desc' },
          include: {
            unlockModule: {
              select: {
                id: true,
                title: true,
                order: true,
                lessons: {
                  select: {
                    id: true,
                  },
                },
              },
            },
            unlockLesson: {
              select: {
                id: true,
                title: true,
                module: {
                  select: {
                    title: true,
                  },
                },
              },
            },
            ...(userId
              ? {
                  attempts: {
                    where: {
                      userId,
                      status: TestAttemptStatus.COMPLETED,
                    },
                    orderBy: { completedAt: 'desc' },
                    take: 1,
                    select: {
                      id: true,
                      status: true,
                      score: true,
                      maxScore: true,
                      completedAt: true,
                    },
                  },
                }
              : {}),
          },
        },
        forms: {
          orderBy: { createdAt: 'desc' },
          include: {
            unlockModule: {
              select: {
                id: true,
                title: true,
                order: true,
                lessons: {
                  select: {
                    id: true,
                  },
                },
              },
            },
            unlockLesson: {
              select: {
                id: true,
                title: true,
                module: {
                  select: {
                    title: true,
                  },
                },
              },
            },
            ...(userId
              ? {
                  attempts: {
                    where: {
                      userId,
                      status: FormAttemptStatus.COMPLETED,
                    },
                    orderBy: { completedAt: 'desc' },
                    take: 1,
                    select: {
                      id: true,
                      status: true,
                      resultId: true,
                      completedAt: true,
                    },
                  },
                }
              : {}),
          },
        },
        _count: {
          select: {
            enrollments: true,
            reviews: true,
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException(`Course ${idOrSlug} not found`);
    }

    return course;
  }

  async create(data: CourseInput) {
    await this.ensureSlugUnique(data.slug);

    const modulesData = this.mapModuleInputs(data.modules);
    const testsData = this.mapTestInputs(data.tests);
    const formsData = this.mapFormInputs(data.forms);

    const created = await this.prisma.course.create({
      data: {
        title: data.title,
        slug: data.slug,
        shortDescription: data.shortDescription,
        description: data.description,
        coverImageUrl: data.coverImageUrl,
        promoVideoUrl: data.promoVideoUrl,
        category: data.category,
        language: data.language ?? CourseLanguage.SR,
        level: data.level ?? CourseLevel.BEGINNER,
        priceAmount: data.isFree ? 0 : data.priceAmount,
        priceCurrency: data.priceCurrency,
        isFree: data.isFree,
        isPublished: data.isPublished,
        publishedAt: data.isPublished ? new Date() : null,
        ...(modulesData.length > 0
          ? {
              modules: {
                create: modulesData,
              },
            }
          : {}),
        ...(testsData.length > 0
          ? {
              tests: {
                create: testsData,
              },
            }
          : {}),
        ...(formsData.length > 0
          ? {
              forms: {
                create: formsData,
              },
            }
          : {}),
      },
    });

    return this.findOne(created.id);
  }

  async update(idOrSlug: string, data: CourseInput) {
    const existing = await this.prisma.course.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
    });

    if (!existing) {
      throw new NotFoundException(`Course ${idOrSlug} not found`);
    }

    if (data.slug !== existing.slug) {
      await this.ensureSlugUnique(data.slug);
    }

    const modulesDefined = data.modules !== undefined;
    const modulesData = this.mapModuleInputs(data.modules);
    const testsDefined = data.tests !== undefined;
    const testsData = this.mapTestInputs(data.tests);
    const formsDefined = data.forms !== undefined;
    const formsData = this.mapFormInputs(data.forms);
    let updatedCourseId = existing.id;

    await this.prisma.$transaction(async (tx) => {
      if (testsDefined) {
        await tx.courseTest.deleteMany({
          where: { courseId: existing.id },
        });
      }

      if (formsDefined) {
        await tx.courseForm.deleteMany({
          where: { courseId: existing.id },
        });
      }

      if (modulesDefined) {
        await tx.courseModule.deleteMany({
          where: { courseId: existing.id },
        });
      }

      const updated = await tx.course.update({
        where: { id: existing.id },
        data: {
          title: data.title,
          slug: data.slug,
          shortDescription: data.shortDescription,
          description: data.description,
          coverImageUrl: data.coverImageUrl,
          promoVideoUrl: data.promoVideoUrl,
          category: data.category,
          language: data.language ?? existing.language,
          level: data.level ?? existing.level,
          priceAmount: data.isFree ? 0 : data.priceAmount,
          priceCurrency: data.priceCurrency,
          isFree: data.isFree,
          isPublished: data.isPublished,
          publishedAt: data.isPublished
            ? (existing.publishedAt ?? new Date())
            : null,
          ...(modulesDefined && modulesData.length > 0
            ? {
                modules: {
                  create: modulesData,
                },
              }
            : {}),
          ...(testsDefined && testsData.length > 0
            ? {
                tests: {
                  create: testsData,
                },
              }
            : {}),
          ...(formsDefined && formsData.length > 0
            ? {
                forms: {
                  create: formsData,
                },
              }
            : {}),
        },
      });

      updatedCourseId = updated.id;
    });

    return this.findOne(updatedCourseId);
  }

  async enrollUser(
    idOrSlug: string,
    payload: EnrollCourseInput,
  ): Promise<{ status: string }> {
    const course = await this.prisma.course.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
    });

    if (!course) {
      throw new NotFoundException(`Course ${idOrSlug} not found`);
    }

    if (!course.isFree) {
      throw new BadRequestException('Course requires payment');
    }

    const userId = payload.userId;

    await this.prisma.$transaction(async (tx) => {
      await tx.user.upsert({
        where: { id: userId },
        update: {
          firstName: payload.firstName ?? null,
          lastName: payload.lastName ?? null,
          username: payload.username ?? null,
          languageCode: payload.languageCode ?? null,
          avatarUrl: payload.avatarUrl ?? null,
        },
        create: {
          id: userId,
          firstName: payload.firstName ?? null,
          lastName: payload.lastName ?? null,
          username: payload.username ?? null,
          languageCode: payload.languageCode ?? null,
          avatarUrl: payload.avatarUrl ?? null,
        },
      });

      await tx.courseEnrollment.upsert({
        where: {
          userId_courseId: {
            userId,
            courseId: course.id,
          },
        },
        update: {
          status: CourseAccessStatus.ACTIVE,
          accessType: CourseAccessType.FREE,
          activatedAt: new Date(),
        },
        create: {
          userId,
          courseId: course.id,
          status: CourseAccessStatus.ACTIVE,
          accessType: CourseAccessType.FREE,
          activatedAt: new Date(),
        },
      });

      await tx.activityLog.create({
        data: {
          actorId: userId,
          actorType: ActivityActorType.USER,
          action: 'course.enroll',
          metadata: {
            courseId: course.id,
            slug: course.slug,
          },
          courseId: course.id,
        },
      });
    });

    return { status: 'enrolled' };
  }

  async listAccessCodes(idOrSlug: string) {
    const course = await this.prisma.course.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      select: { id: true },
    });

    if (!course) {
      throw new NotFoundException(`Course ${idOrSlug} not found`);
    }

    return this.prisma.courseAccessCode.findMany({
      where: { courseId: course.id },
      orderBy: { createdAt: 'desc' },
      include: {
        activatedBy: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async generateAccessCode(
    idOrSlug: string,
    payload: GenerateAccessCodeInput,
  ) {
    const course = await this.prisma.course.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      select: { id: true, title: true, slug: true },
    });

    if (!course) {
      throw new NotFoundException(`Course ${idOrSlug} not found`);
    }

    const note = payload.note?.trim() ?? null;
    const createdBy = payload.createdBy?.trim() ?? null;
    let lastError: unknown = null;

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const code = this.buildAccessCode();
      try {
        const record = await this.prisma.courseAccessCode.create({
          data: {
            courseId: course.id,
            code,
            note,
            createdBy,
          },
          include: {
            activatedBy: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });

        await this.prisma.activityLog.create({
          data: {
            actorType: ActivityActorType.ADMIN,
            action: 'course.access_code.generated',
            metadata: {
              courseId: course.id,
              courseSlug: course.slug,
              codeId: record.id,
              note,
            },
            courseId: course.id,
          },
        });

        return record;
      } catch (error) {
        lastError = error;
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          continue;
        }
        throw error;
      }
    }

    console.error('[courses] failed to generate unique code', lastError);
    throw new BadRequestException(
      'Не удалось сгенерировать код доступа. Попробуйте ещё раз.',
    );
  }

  async redeemAccessCode(
    idOrSlug: string,
    payload: RedeemAccessCodeInput,
  ): Promise<{ status: string }> {
    const course = await this.prisma.course.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      select: {
        id: true,
        slug: true,
        title: true,
        priceAmount: true,
        priceCurrency: true,
      },
    });

    if (!course) {
      throw new NotFoundException(`Course ${idOrSlug} not found`);
    }

    const codeValue = payload.code?.trim().toUpperCase();
    if (!codeValue) {
      throw new BadRequestException('Введите код доступа');
    }

    const codeRecord = await this.prisma.courseAccessCode.findUnique({
      where: { code: codeValue },
    });

    if (!codeRecord || codeRecord.courseId !== course.id) {
      throw new BadRequestException('Код не найден или относится к другому курсу.');
    }

    if (codeRecord.status === CourseAccessCodeStatus.REDEEMED) {
      throw new BadRequestException('Этот код уже был активирован.');
    }

    if (codeRecord.status === CourseAccessCodeStatus.REVOKED) {
      throw new BadRequestException('Этот код аннулирован. Свяжитесь с поддержкой.');
    }

    const userId = payload.userId;
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.user.upsert({
        where: { id: userId },
        update: {
          firstName: payload.firstName ?? null,
          lastName: payload.lastName ?? null,
          username: payload.username ?? null,
          languageCode: payload.languageCode ?? null,
          avatarUrl: payload.avatarUrl ?? null,
        },
        create: {
          id: userId,
          firstName: payload.firstName ?? null,
          lastName: payload.lastName ?? null,
          username: payload.username ?? null,
          languageCode: payload.languageCode ?? null,
          avatarUrl: payload.avatarUrl ?? null,
        },
      });

      await tx.courseEnrollment.upsert({
        where: {
          userId_courseId: {
            userId,
            courseId: course.id,
          },
        },
        update: {
          status: CourseAccessStatus.ACTIVE,
          accessType: CourseAccessType.GRANTED,
          activatedAt: now,
          pricePaid: course.priceAmount,
          priceCurrency: course.priceCurrency,
        },
        create: {
          userId,
          courseId: course.id,
          status: CourseAccessStatus.ACTIVE,
          accessType: CourseAccessType.GRANTED,
          activatedAt: now,
          pricePaid: course.priceAmount,
          priceCurrency: course.priceCurrency,
        },
      });

      await tx.courseAccessCode.update({
        where: { id: codeRecord.id },
        data: {
          status: CourseAccessCodeStatus.REDEEMED,
          activatedById: userId,
          activatedAt: now,
        },
      });

      await tx.activityLog.create({
        data: {
          actorId: userId,
          actorType: ActivityActorType.USER,
          action: 'course.access_code.redeemed',
          metadata: {
            courseId: course.id,
            courseSlug: course.slug,
            codeId: codeRecord.id,
            code: codeRecord.code,
          },
          courseId: course.id,
        },
      });
    });

    return { status: 'redeemed' };
  }

  async redeemAccessCodeByCode(
    payload: RedeemAccessCodeInput,
  ): Promise<{ status: string; courseSlug: string }> {
    const codeValue = payload.code?.trim().toUpperCase();
    if (!codeValue) {
      throw new BadRequestException('Введите код доступа');
    }

    const codeRecord = await this.prisma.courseAccessCode.findUnique({
      where: { code: codeValue },
      include: {
        course: {
          select: {
            id: true,
            slug: true,
            title: true,
            priceAmount: true,
            priceCurrency: true,
          },
        },
      },
    });

    if (!codeRecord) {
      throw new BadRequestException('Код не найден.');
    }

    if (codeRecord.status === CourseAccessCodeStatus.REDEEMED) {
      throw new BadRequestException('Этот код уже был активирован.');
    }

    if (codeRecord.status === CourseAccessCodeStatus.REVOKED) {
      throw new BadRequestException('Этот код аннулирован. Свяжитесь с поддержкой.');
    }

    const course = codeRecord.course;
    const userId = payload.userId;
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.user.upsert({
        where: { id: userId },
        update: {
          firstName: payload.firstName ?? null,
          lastName: payload.lastName ?? null,
          username: payload.username ?? null,
          languageCode: payload.languageCode ?? null,
          avatarUrl: payload.avatarUrl ?? null,
        },
        create: {
          id: userId,
          firstName: payload.firstName ?? null,
          lastName: payload.lastName ?? null,
          username: payload.username ?? null,
          languageCode: payload.languageCode ?? null,
          avatarUrl: payload.avatarUrl ?? null,
        },
      });

      await tx.courseEnrollment.upsert({
        where: {
          userId_courseId: {
            userId,
            courseId: course.id,
          },
        },
        update: {
          status: CourseAccessStatus.ACTIVE,
          accessType: CourseAccessType.GRANTED,
          activatedAt: now,
          pricePaid: course.priceAmount,
          priceCurrency: course.priceCurrency,
        },
        create: {
          userId,
          courseId: course.id,
          status: CourseAccessStatus.ACTIVE,
          accessType: CourseAccessType.GRANTED,
          activatedAt: now,
          pricePaid: course.priceAmount,
          priceCurrency: course.priceCurrency,
        },
      });

      await tx.courseAccessCode.update({
        where: { id: codeRecord.id },
        data: {
          status: CourseAccessCodeStatus.REDEEMED,
          activatedById: userId,
          activatedAt: now,
        },
      });

      await tx.activityLog.create({
        data: {
          actorId: userId,
          actorType: ActivityActorType.USER,
          action: 'course.access_code.redeemed',
          metadata: {
            courseId: course.id,
            courseSlug: course.slug,
            codeId: codeRecord.id,
            code: codeRecord.code,
          },
          courseId: course.id,
        },
      });
    });

    return { status: 'redeemed', courseSlug: course.slug };
  }

  async remove(idOrSlug: string): Promise<{ status: string }> {
    const course = await this.prisma.course.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      select: { id: true },
    });

    if (!course) {
      throw new NotFoundException(`Course ${idOrSlug} not found`);
    }

    await this.prisma.course.delete({
      where: { id: course.id },
    });

    return { status: 'deleted' };
  }

  async startTest(
    idOrSlug: string,
    testId: string,
    payload: StartTestInput,
  ): Promise<{ attemptId: string; test: PublicTest }> {
    const course = await this.prisma.course.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      select: {
        id: true,
        slug: true,
        title: true,
        modules: {
          select: {
            id: true,
            order: true,
            lessons: {
              select: { id: true },
            },
          },
          orderBy: { order: 'asc' },
        },
        tests: {
          where: { id: testId },
          select: {
            id: true,
            title: true,
            description: true,
            questions: true,
            unlockLessonId: true,
            unlockModuleId: true,
            unlockLesson: {
              select: {
                id: true,
                title: true,
              },
            },
            unlockModule: {
              select: {
                id: true,
                title: true,
                order: true,
                lessons: {
                  select: { id: true },
                },
              },
            },
          },
        },
      },
    });

    if (!course || course.tests.length === 0) {
      throw new NotFoundException(`Test ${testId} not found in course ${idOrSlug}`);
    }

    const testRecord = course.tests[0];
    const userId = payload.userId;

    await this.prisma.user.upsert({
      where: { id: userId },
      update: {
        firstName: payload.firstName ?? null,
        lastName: payload.lastName ?? null,
        username: payload.username ?? null,
        languageCode: payload.languageCode ?? null,
        avatarUrl: payload.avatarUrl ?? null,
      },
      create: {
        id: userId,
        firstName: payload.firstName ?? null,
        lastName: payload.lastName ?? null,
        username: payload.username ?? null,
        languageCode: payload.languageCode ?? null,
        avatarUrl: payload.avatarUrl ?? null,
      },
    });

    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: course.id,
        },
      },
      select: {
        status: true,
      },
    });

    if (!enrollment || enrollment.status !== CourseAccessStatus.ACTIVE) {
      throw new BadRequestException(
        'Нет доступа к тесту. Сначала активируйте курс.',
      );
    }

    if (testRecord.unlockLessonId) {
      const lessonProgress = await this.prisma.courseProgress.findUnique({
        where: {
          userId_lessonId: {
            userId,
            lessonId: testRecord.unlockLessonId,
          },
        },
        select: { status: true },
      });

      if (
        !lessonProgress ||
        lessonProgress.status !== LessonProgressStatus.COMPLETED
      ) {
        throw new BadRequestException(
          `Чтобы открыть тест, завершите урок "${testRecord.unlockLesson?.title ?? 'нужный урок'}".`,
        );
      }
    }

    if (testRecord.unlockModuleId && testRecord.unlockModule) {
      // Тест разблокирует модуль, поэтому нужно проверить завершение уроков ПРЕДЫДУЩЕГО модуля
      const unlockModuleOrder = testRecord.unlockModule.order;
      
      // Если это первый модуль (order = 0), тест доступен без проверки
      if (unlockModuleOrder > 0 && course.modules && course.modules.length > 0) {
        const previousModule = course.modules.find(
          (m) => m.order === unlockModuleOrder - 1,
        );

        if (previousModule && previousModule.lessons.length > 0) {
          const previousModuleLessonIds = previousModule.lessons.map((l) => l.id);
          const completedLessons = await this.prisma.courseProgress.count({
            where: {
              userId,
              lessonId: { in: previousModuleLessonIds },
              status: LessonProgressStatus.COMPLETED,
            },
          });

          if (completedLessons < previousModuleLessonIds.length) {
            throw new BadRequestException(
              `Для доступа к тесту завершите все уроки предыдущего модуля.`,
            );
          }
        }
      }
    }

    const test = this.mapStoredQuestionsToPublic(testRecord);

    const attempt = await this.prisma.testAttempt.create({
      data: {
        testId,
        userId,
        status: TestAttemptStatus.IN_PROGRESS,
        maxScore: test.maxScore,
        startedAt: new Date(),
      },
      select: { id: true },
    });

    await this.prisma.activityLog.create({
      data: {
        actorId: userId,
        actorType: ActivityActorType.USER,
        action: 'course.test.started',
        metadata: {
          courseId: course.id,
          courseSlug: course.slug,
          testId,
        },
        courseId: course.id,
      },
    });

    return {
      attemptId: attempt.id,
      test,
    };
  }

  async submitTest(
    idOrSlug: string,
    testId: string,
    payload: SubmitTestInput,
  ): Promise<SubmitTestResult> {
    const attempt = await this.prisma.testAttempt.findUnique({
      where: { id: payload.attemptId },
      include: {
        test: {
          select: {
            id: true,
            courseId: true,
            questions: true,
            course: {
              select: { slug: true },
            },
          },
        },
      },
    });

    if (
      !attempt ||
      attempt.test.id !== testId ||
      (attempt.test.course.slug !== idOrSlug && attempt.test.courseId !== idOrSlug)
    ) {
      throw new NotFoundException('Test attempt not found');
    }

    if (attempt.status === TestAttemptStatus.COMPLETED) {
      const score = attempt.score ?? 0;
      const maxScore = attempt.maxScore ?? 0;
      return {
        attemptId: attempt.id,
        score,
        maxScore,
        percent: maxScore === 0 ? 0 : Math.round((score / maxScore) * 100),
        answers: (attempt.responses as TestAnswerEvaluation[]) ?? [],
      };
    }

    const storedQuestions = this.parseStoredQuestions(attempt.test.questions);
    const evaluations = this.evaluateAnswers(storedQuestions, payload.answers);
    const score = evaluations.reduce(
      (total, answer) => (answer.correct ? total + 1 : total),
      0,
    );
    const maxScore =
      storedQuestions.filter((question) => this.isQuestionScored(question)).length ||
      storedQuestions.length;
    const percent = maxScore === 0 ? 0 : Math.round((score / maxScore) * 100);

    await this.prisma.testAttempt.update({
      where: { id: attempt.id },
      data: {
        responses: evaluations as unknown as Prisma.InputJsonValue,
        score,
        maxScore,
        status: TestAttemptStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    await this.prisma.activityLog.create({
      data: {
        actorId: attempt.userId,
        actorType: ActivityActorType.USER,
        action: 'course.test.completed',
        metadata: {
          courseId: attempt.test.courseId,
          courseSlug: attempt.test.course.slug,
          testId,
          attemptId: attempt.id,
          score,
          maxScore,
          percent,
        },
        courseId: attempt.test.courseId,
      },
    });

    return {
      attemptId: attempt.id,
      score,
      maxScore,
      percent,
      answers: evaluations,
    };
  }

  private buildAccessCode() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const desiredLength = 12;
    let value = '';

    while (value.length < desiredLength) {
      const bytes = randomBytes(desiredLength);
      for (const byte of bytes) {
        if (value.length >= desiredLength) {
          break;
        }
        const index = byte % alphabet.length;
        value += alphabet[index];
      }
    }

    const chunks = value.match(/.{1,4}/g);
    return chunks ? chunks.join('-') : value;
  }

  private parseStoredQuestions(raw: Prisma.JsonValue): StoredTestQuestion[] {
    if (!Array.isArray(raw)) {
      return [];
    }

    const result: StoredTestQuestion[] = [];

    for (const item of raw) {
      if (!item || typeof item !== 'object') {
        continue;
      }

      const record = item as Record<string, unknown>;
      const type = record.type;
      const prompt =
        typeof record.prompt === 'string' && record.prompt.trim().length > 0
          ? record.prompt.trim()
          : 'Вопрос';
      const explanation =
        typeof record.explanation === 'string' && record.explanation.trim().length > 0
          ? record.explanation.trim()
          : undefined;

      if (type === 'open') {
        result.push({
          type: 'open',
          prompt,
          explanation,
          correctAnswer:
            typeof record.correctAnswer === 'string'
              ? record.correctAnswer.trim()
              : undefined,
        });
        continue;
      }

      if (!Array.isArray(record.options)) {
        continue;
      }

      const parsedOptions = (record.options as Array<Record<string, unknown>>)
        .map((option) => {
          const text =
            typeof option.text === 'string' ? option.text.trim() : '';
          if (text.length === 0) {
            return null;
          }
          return {
            text,
            isCorrect: option.isCorrect === true,
          };
        })
        .filter((option): option is { text: string; isCorrect: boolean } => option !== null);

      if (parsedOptions.length === 0) {
        continue;
      }

      const correctCount = parsedOptions.reduce(
        (acc, option) => (option.isCorrect ? acc + 1 : acc),
        0,
      );

      const inferredType: 'single' | 'multiple' =
        type === 'multiple' || correctCount > 1 ? 'multiple' : 'single';

      result.push({
        type: inferredType,
        prompt,
        explanation,
        options: parsedOptions,
      });
    }

    return result;
  }

  private isQuestionScored(question: StoredTestQuestion): boolean {
    if (question.type === 'open') {
      return Boolean(question.correctAnswer && question.correctAnswer.length > 0);
    }
    return question.options.some((option) => option.isCorrect);
  }

  private mapStoredQuestionsToPublic(test: {
    id: string;
    title: string;
    description: string | null;
    questions: Prisma.JsonValue;
    unlockModuleId?: string | null;
    unlockLessonId?: string | null;
    unlockModule?: {
      id: string;
      title: string;
    } | null;
    unlockLesson?: {
      id: string;
      title: string;
    } | null;
  }): PublicTest {
    const questions = this.parseStoredQuestions(test.questions);

    const publicQuestions = questions.map((question, index) => ({
      id: `q-${index}`,
      order: index,
      type: question.type,
      prompt: question.prompt,
      explanation: question.explanation,
      options:
        question.type === 'open'
          ? undefined
          : question.options.map((option, optionIndex) => ({
              id: `q-${index}-opt-${optionIndex}`,
              text: option.text,
            })),
    }));

    const maxScore = questions.filter((question) => this.isQuestionScored(question)).length;

    return {
      id: test.id,
      title: test.title,
      description: test.description,
      questionCount: questions.length,
      maxScore: maxScore > 0 ? maxScore : questions.length,
      questions: publicQuestions,
      unlockLesson: test.unlockLessonId
        ? {
            id: test.unlockLessonId,
            title: test.unlockLesson?.title ?? 'Урок',
          }
        : undefined,
      unlockModule: test.unlockModuleId
        ? {
            id: test.unlockModuleId,
            title: test.unlockModule?.title ?? 'Модуль',
          }
        : undefined,
    };
  }

  private evaluateAnswers(
    questions: StoredTestQuestion[],
    answers: SubmitTestAnswer[],
  ): TestAnswerEvaluation[] {
    const answerMap = new Map(answers.map((answer) => [answer.questionId, answer]));

    return questions.map((question, index) => {
      const questionId = `q-${index}`;
      const submitted = answerMap.get(questionId);
      if (!submitted) {
        return {
          questionId,
          correct: false,
          explanation: question.explanation ?? null,
        };
      }

      if (question.type === 'open') {
        const expected = question.correctAnswer ?? null;
        const provided = (submitted.textAnswer ?? '').trim();
        if (!expected) {
          return {
            questionId,
            correct: null,
            textAnswer: provided,
            expectedAnswer: null,
            explanation: question.explanation ?? null,
          };
        }

        const correct =
          expected.trim().toLocaleLowerCase() === provided.toLocaleLowerCase();

        return {
          questionId,
          correct,
          textAnswer: provided,
          expectedAnswer: expected,
          explanation: question.explanation ?? null,
        };
      }

      const correctIndexes = question.options
        .map((option, optionIndex) => (option.isCorrect ? optionIndex : null))
        .filter((value): value is number => value !== null);

      const selectedIndexes = (submitted.selectedOptionIds ?? [])
        .map((id) => {
          const match = /q-\d+-opt-(\d+)/.exec(id ?? '');
          if (!match) return null;
          const parsed = Number.parseInt(match[1] ?? '', 10);
          return Number.isNaN(parsed) ? null : parsed;
        })
        .filter((value): value is number => value !== null);

      selectedIndexes.sort();
      correctIndexes.sort();

      const correct =
        selectedIndexes.length === correctIndexes.length &&
        selectedIndexes.every((value, idx) => value === correctIndexes[idx]);

      return {
        questionId,
        correct,
        selectedOptionIds: selectedIndexes.map(
          (optionIndex) => `q-${index}-opt-${optionIndex}`,
        ),
        correctOptionIds: correctIndexes.map(
          (optionIndex) => `q-${index}-opt-${optionIndex}`,
        ),
        explanation: question.explanation ?? null,
      };
    });
  }

  private async ensureSlugUnique(slug: string) {
    const exists = await this.prisma.course.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (exists) {
      throw new BadRequestException('Course slug must be unique');
    }
  }

  private mapModuleInputs(
    modules?: CourseModuleInput[],
  ): Prisma.CourseModuleCreateWithoutCourseInput[] {
    if (!modules) {
      return [];
    }

    return modules.map((module, moduleIndex) => {
      const lessons = module.lessons ?? [];
      return {
        id: module.id ?? undefined,
        title: module.title,
        description: module.description ?? null,
        order:
          typeof module.order === 'number' && !Number.isNaN(module.order)
            ? module.order
            : moduleIndex + 1,
        lessons: {
          create: lessons.map((lesson, lessonIndex) => ({
            id: lesson.id ?? undefined,
            title: lesson.title,
            summary: lesson.summary ?? null,
            content:
              lesson.content !== undefined
                ? lesson.content
                : Prisma.JsonNull,
            contentType: lesson.contentType ?? LessonContentType.TEXT,
            videoUrl: lesson.videoUrl ?? null,
            durationMinutes:
              typeof lesson.durationMinutes === 'number' &&
              !Number.isNaN(lesson.durationMinutes)
                ? lesson.durationMinutes
                : null,
            order:
              typeof lesson.order === 'number' && !Number.isNaN(lesson.order)
                ? lesson.order
                : lessonIndex + 1,
            isPreview: lesson.isPreview ?? false,
          })),
        },
      };
    });
  }

  private mapTestInputs(
    tests?: CourseTestInput[],
  ): Prisma.CourseTestCreateWithoutCourseInput[] {
    if (!tests) {
      return [];
    }

    return tests.map((test) => {
      const unlockModuleId =
        typeof test.unlockModuleId === 'string' ? test.unlockModuleId.trim() : '';
      const unlockLessonId =
        typeof test.unlockLessonId === 'string' ? test.unlockLessonId.trim() : '';

      return {
        title: test.title,
        description: test.description ?? null,
        questions: test.questions ?? Prisma.JsonNull,
        unlockModuleId: unlockModuleId.length > 0 ? unlockModuleId : null,
        unlockLessonId: unlockLessonId.length > 0 ? unlockLessonId : null,
      };
    });
  }

  private mapFormInputs(
    forms?: CourseFormInput[],
  ): Prisma.CourseFormCreateWithoutCourseInput[] {
    if (!forms) {
      return [];
    }

    return forms.map((form) => {
      const unlockModuleId =
        typeof form.unlockModuleId === 'string' ? form.unlockModuleId.trim() : '';
      const unlockLessonId =
        typeof form.unlockLessonId === 'string' ? form.unlockLessonId.trim() : '';

      const lessonId =
        typeof form.lessonId === 'string' ? form.lessonId.trim() : '';

      return {
        title: form.title,
        description: form.description ?? null,
        type: form.type === "RATING" ? FormType.RATING : FormType.CHOICE,
        maxRating: form.type === "RATING" && typeof form.maxRating === "number" ? form.maxRating : null,
        questions: form.questions ?? Prisma.JsonNull,
        results: form.results ?? Prisma.JsonNull,
        lessonId: lessonId.length > 0 ? lessonId : null,
        unlockModuleId: unlockModuleId.length > 0 ? unlockModuleId : null,
        unlockLessonId: unlockLessonId.length > 0 ? unlockLessonId : null,
      };
    });
  }

  async startForm(
    idOrSlug: string,
    formId: string,
    payload: StartFormInput,
  ): Promise<{ attemptId: string; form: PublicForm }> {
    const course = await this.prisma.course.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      select: {
        id: true,
        slug: true,
        title: true,
        forms: {
          where: { id: formId },
          select: {
            id: true,
            title: true,
            description: true,
            type: true,
            maxRating: true,
            questions: true,
            results: true,
            unlockLessonId: true,
            unlockModuleId: true,
            unlockLesson: {
              select: {
                id: true,
                title: true,
              },
            },
            unlockModule: {
              select: {
                id: true,
                title: true,
                lessons: {
                  select: { id: true },
                },
              },
            },
          },
        },
      },
    });

    if (!course || course.forms.length === 0) {
      throw new NotFoundException(`Form ${formId} not found in course ${idOrSlug}`);
    }

    const formRecord = course.forms[0];
    const userId = payload.userId;

    await this.prisma.user.upsert({
      where: { id: userId },
      update: {
        firstName: payload.firstName ?? null,
        lastName: payload.lastName ?? null,
        username: payload.username ?? null,
        languageCode: payload.languageCode ?? null,
        avatarUrl: payload.avatarUrl ?? null,
      },
      create: {
        id: userId,
        firstName: payload.firstName ?? null,
        lastName: payload.lastName ?? null,
        username: payload.username ?? null,
        languageCode: payload.languageCode ?? null,
        avatarUrl: payload.avatarUrl ?? null,
      },
    });

    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: course.id,
        },
      },
    });

    if (!enrollment || enrollment.status !== CourseAccessStatus.ACTIVE) {
      throw new BadRequestException('У вас нет доступа к этому курсу');
    }

    const attempt = await this.prisma.formAttempt.create({
      data: {
        formId: formRecord.id,
        userId,
        status: FormAttemptStatus.IN_PROGRESS,
      },
    });

    const publicForm = this.mapStoredFormToPublic(formRecord);

    return {
      attemptId: attempt.id,
      form: publicForm,
    };
  }

  async submitForm(
    idOrSlug: string,
    formId: string,
    payload: SubmitFormInput,
  ): Promise<SubmitFormResult> {
    const attempt = await this.prisma.formAttempt.findUnique({
      where: { id: payload.attemptId },
      include: {
        form: {
          select: {
            id: true,
            courseId: true,
            type: true,
            maxRating: true,
            questions: true,
            results: true,
            course: {
              select: { slug: true },
            },
          },
        },
      },
    });

    if (
      !attempt ||
      attempt.form.id !== formId ||
      (attempt.form.course.slug !== idOrSlug && attempt.form.courseId !== idOrSlug)
    ) {
      throw new NotFoundException('Form attempt not found');
    }

    if (attempt.status === FormAttemptStatus.COMPLETED) {
      return {
        attemptId: attempt.id,
        resultId: attempt.resultId ?? undefined,
        result: attempt.resultId
          ? this.getFormResultById(attempt.form.results, attempt.resultId)
          : undefined,
      };
    }

    // Подсчитываем результаты на основе выбранных вариантов или оценок
    const resultId = this.calculateFormResult(
      attempt.form.type,
      attempt.form.maxRating,
      attempt.form.questions,
      attempt.form.results,
      payload.responses,
    );

    await this.prisma.formAttempt.update({
      where: { id: attempt.id },
      data: {
        responses: payload.responses as unknown as Prisma.InputJsonValue,
        resultId,
        status: FormAttemptStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    await this.prisma.activityLog.create({
      data: {
        actorId: attempt.userId,
        actorType: ActivityActorType.USER,
        action: 'course.form.completed',
        metadata: {
          courseId: attempt.form.courseId,
          courseSlug: attempt.form.course.slug,
          formId,
          attemptId: attempt.id,
          resultId,
        },
        courseId: attempt.form.courseId,
      },
    });

    const result = resultId ? this.getFormResultById(attempt.form.results, resultId) : undefined;

    return {
      attemptId: attempt.id,
      resultId: resultId ?? undefined,
      result,
    };
  }

  private calculateFormResult(
    formType: FormType,
    maxRating: number | null,
    questions: Prisma.JsonValue,
    results: Prisma.JsonValue,
    responses: Record<string, string | string[]>,
  ): string | null {
    if (!Array.isArray(questions) || !Array.isArray(results)) {
      return null;
    }

    // Для рейтинговых форм подсчитываем сумму баллов
    if (formType === FormType.RATING) {
      let totalScore = 0;

      for (const question of questions) {
        if (!question || typeof question !== 'object') continue;
        const q = question as Record<string, unknown>;
        const questionId = typeof q.id === 'string' ? q.id : '';
        const response = responses[questionId];

        if (!response) continue;

        // Для рейтинговых форм response - это число (оценка)
        const rating = Array.isArray(response) 
          ? parseFloat(response[0] || '0')
          : parseFloat(response as string || '0');

        if (!Number.isNaN(rating) && rating >= 1) {
          const max = maxRating ?? 5;
          totalScore += Math.max(1, Math.min(max, Math.round(rating)));
        }
      }

      // Находим результат на основе диапазонов баллов
      for (const result of results) {
        if (!result || typeof result !== 'object') continue;
        const r = result as Record<string, unknown>;
        const resultId = typeof r.id === 'string' ? r.id : '';
        const minScore = typeof r.minScore === 'number' ? r.minScore : undefined;
        const maxScore = typeof r.maxScore === 'number' ? r.maxScore : undefined;

        if (!resultId) continue;

        // Проверяем, попадает ли сумма баллов в диапазон
        const inRange = 
          (minScore === undefined || totalScore >= minScore) &&
          (maxScore === undefined || totalScore <= maxScore);

        if (inRange) {
          return resultId;
        }
      }

      return null;
    }

    // Для форм с выбором вариантов (CHOICE) - существующая логика
    // Подсчитываем количество выбранных вариантов по категориям
    const categoryCounts: Record<string, number> = {};

    for (const question of questions) {
      if (!question || typeof question !== 'object') continue;
      const q = question as Record<string, unknown>;
      const questionId = typeof q.id === 'string' ? q.id : '';
      const response = responses[questionId];

      if (!response) continue;

      const selectedOptionIds = Array.isArray(response) ? response : [response];

      if (!Array.isArray(q.options)) continue;

      for (const option of q.options) {
        if (!option || typeof option !== 'object') continue;
        const opt = option as Record<string, unknown>;
        const optionId = typeof opt.id === 'string' ? opt.id : '';
        const category = typeof opt.category === 'string' ? opt.category : '';

        if (selectedOptionIds.includes(optionId) && category) {
          categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        }
      }
    }

    // Находим результат на основе условий
    for (const result of results) {
      if (!result || typeof result !== 'object') continue;
      const r = result as Record<string, unknown>;
      const condition = typeof r.condition === 'string' ? r.condition : '';
      const resultId = typeof r.id === 'string' ? r.id : '';

      if (!condition || !resultId) continue;

      // Парсим условие (например, "more_A", "more_B", "equal_A_B")
      if (condition.startsWith('more_')) {
        const category = condition.replace('more_', '');
        const count = categoryCounts[category] || 0;
        const otherCounts = Object.entries(categoryCounts)
          .filter(([cat]) => cat !== category)
          .map(([, cnt]) => cnt);
        const maxOtherCount = otherCounts.length > 0 ? Math.max(...otherCounts) : 0;

        if (count > maxOtherCount) {
          return resultId;
        }
      } else if (condition.startsWith('equal_')) {
        // Для условий типа "equal_A_B" проверяем равенство
        const categories = condition.replace('equal_', '').split('_');
        if (categories.length === 2) {
          const countA = categoryCounts[categories[0]] || 0;
          const countB = categoryCounts[categories[1]] || 0;
          if (countA === countB && countA > 0) {
            return resultId;
          }
        }
      }
    }

    // Если не нашли подходящий результат, возвращаем первый или null
    const firstResult = results[0];
    if (firstResult && typeof firstResult === 'object') {
      const r = firstResult as Record<string, unknown>;
      return typeof r.id === 'string' ? r.id : null;
    }

    return null;
  }

  private getFormResultById(
    results: Prisma.JsonValue,
    resultId: string,
  ): { id: string; title: string; description?: string } | undefined {
    if (!Array.isArray(results)) {
      return undefined;
    }

    const result = results.find((r) => {
      if (!r || typeof r !== 'object') return false;
      const rObj = r as Record<string, unknown>;
      return rObj.id === resultId;
    });

    if (!result || typeof result !== 'object') {
      return undefined;
    }

    const rObj = result as Record<string, unknown>;
    return {
      id: typeof rObj.id === 'string' ? rObj.id : resultId,
      title: typeof rObj.title === 'string' ? rObj.title : 'Результат',
      description: typeof rObj.description === 'string' ? rObj.description : undefined,
    };
  }

  private mapStoredFormToPublic(form: {
    id: string;
    title: string;
    description: string | null;
    type: FormType;
    maxRating: number | null;
    questions: Prisma.JsonValue;
    results: Prisma.JsonValue;
    unlockModuleId?: string | null;
    unlockLessonId?: string | null;
    unlockModule?: {
      id: string;
      title: string;
    } | null;
    unlockLesson?: {
      id: string;
      title: string;
    } | null;
  }): PublicForm {
    const questions = Array.isArray(form.questions) ? form.questions : [];
    const publicQuestions = questions.map((question, index) => {
      if (!question || typeof question !== 'object') {
        return {
          id: `q-${index}`,
          order: index,
          text: 'Вопрос',
          options: [],
        };
      }

      const q = question as Record<string, unknown>;
      const options = Array.isArray(q.options) ? q.options : [];

      return {
        id: typeof q.id === 'string' ? q.id : `q-${index}`,
        order: index,
        text: typeof q.text === 'string' ? q.text : 'Вопрос',
        options: options.map((option, optIndex) => {
          if (!option || typeof option !== 'object') {
            return {
              id: `q-${index}-opt-${optIndex}`,
              text: 'Вариант',
              category: '',
            };
          }
          const opt = option as Record<string, unknown>;
          return {
            id: typeof opt.id === 'string' ? opt.id : `q-${index}-opt-${optIndex}`,
            text: typeof opt.text === 'string' ? opt.text : 'Вариант',
            category: typeof opt.category === 'string' ? opt.category : '',
          };
        }),
      };
    });

    return {
      id: form.id,
      title: form.title,
      description: form.description,
      type: form.type === FormType.RATING ? "RATING" : "CHOICE",
      maxRating: form.maxRating,
      questionCount: publicQuestions.length,
      questions: publicQuestions,
      unlockLesson: form.unlockLessonId
        ? {
            id: form.unlockLessonId,
            title: form.unlockLesson?.title ?? 'Урок',
          }
        : undefined,
      unlockModule: form.unlockModuleId
        ? {
            id: form.unlockModuleId,
            title: form.unlockModule?.title ?? 'Модуль',
          }
        : undefined,
    };
  }
}
