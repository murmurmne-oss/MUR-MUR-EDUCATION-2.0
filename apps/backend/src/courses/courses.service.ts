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

  async findOne(idOrSlug: string) {
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
    let updatedCourseId = existing.id;

    await this.prisma.$transaction(async (tx) => {
      if (testsDefined) {
        await tx.courseTest.deleteMany({
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

    if (testRecord.unlockModuleId) {
      const lessonIds =
        testRecord.unlockModule?.lessons?.map((lesson) => lesson.id) ?? [];

      if (lessonIds.length > 0) {
        const completedLessons = await this.prisma.courseProgress.count({
          where: {
            userId,
            lessonId: { in: lessonIds },
            status: LessonProgressStatus.COMPLETED,
          },
        });

        if (completedLessons < lessonIds.length) {
          throw new BadRequestException(
            `Для доступа к тесту завершите уроки модуля "${testRecord.unlockModule?.title ?? 'нужный модуль'}".`,
          );
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
}
