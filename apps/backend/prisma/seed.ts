import {
  ActivityActorType,
  CourseAccessStatus,
  CourseAccessType,
  CourseCategory,
  CourseLevel,
  Currency,
  LessonContentType,
  LessonProgressStatus,
  PaymentStatus,
  ReminderFrequency,
  ReminderTimeOfDay,
  ReviewStatus,
  PrismaClient,
} from '@prisma/client';

const prisma = new PrismaClient();

const coursesSeed = [
  {
    slug: 'azbuka-seksa',
    title: 'Азбука Секса',
    shortDescription: 'Главный курс для мягкого и глубокого погружения в сексуальное благополучие.',
    description:
      'Курс сочетает в себе психоэмоциональные практики, работу с телом и коммуникацией. Идеален для тех, кто хочет системно развивать осознанность и уверенность в интимной сфере.',
    coverImageUrl:
      'https://i.postimg.cc/hvSQcWwL/Neutral-Black-And-White-Minimalist-Aesthetic-Modern-Simple-Laser-Hair-Removal-Instagram-Post-1.png',
    promoVideoUrl: null,
    category: CourseCategory.PSYCHOSEXUALITY,
    level: CourseLevel.INTERMEDIATE,
    priceAmount: 3900,
    priceCurrency: Currency.EUR,
    isFree: false,
    modules: [
      {
        title: 'Осознанность и тело',
        description: 'Учимся слышать тело, работать с дыханием и распознавать свои желания.',
        order: 1,
        lessons: [
          {
            title: 'Добро пожаловать в курс',
            summary: 'Что вас ждёт, как устроена программа и как подготовиться.',
            contentType: LessonContentType.VIDEO,
            order: 1,
            durationMinutes: 12,
            isPreview: true,
            content: {
              kind: 'intro',
              focus: ['course-structure', 'паттерны поведения', 'настрой'],
            },
          },
          {
            title: 'Практика: сканирование тела',
            summary: 'Набор упражнений на расслабление и тонкую настройку внимания.',
            contentType: LessonContentType.TEXT,
            order: 2,
            durationMinutes: 20,
            content: {
              blocks: [
                { type: 'paragraph', text: 'Найдите тихое место и приготовьте коврик.' },
                { type: 'steps', items: ['Дыхание 4-4-6', 'Сканирование', 'Запись ощущений'] },
              ],
            },
          },
        ],
      },
      {
        title: 'Коммуникация и границы',
        description: 'Работаем с языком желаний, согласием и безопасностью.',
        order: 2,
        lessons: [
          {
            title: 'Язык желаний',
            summary: 'Как говорить о своих предпочтениях мягко и уважительно.',
            contentType: LessonContentType.TEXT,
            order: 1,
            durationMinutes: 18,
            content: {
              template: 'dialog',
              prompts: ['Я хочу', 'Мне важно', 'Я не готов/а к...'],
            },
          },
          {
            title: 'Практикум по границам',
            summary: 'Интерактивные карточки и чек-листы для работы с партнёром.',
            contentType: LessonContentType.VIDEO,
            order: 2,
            durationMinutes: 15,
            content: {
              resources: ['worksheet/boundaries.pdf'],
            },
          },
        ],
      },
    ],
  },
  {
    slug: 'eros-every-day',
    title: 'Eros & every day',
    shortDescription: 'Ежедневные ритуалы и микропрактики, чтобы привнести эротику в повседневность.',
    description:
      'Программа сочетает короткие задания, медитации и инструменты самоподдержки. Подходит для самостоятельной практики, а также для работы с партнёром.',
    coverImageUrl:
      'https://i.postimg.cc/gj37dLxM/Dizajn-bez-nazvania-2.png',
    promoVideoUrl: null,
    category: CourseCategory.EROS_EVERY_DAY,
    level: CourseLevel.BEGINNER,
    priceAmount: 0,
    priceCurrency: Currency.EUR,
    isFree: true,
    modules: [
      {
        title: 'Утренние ритуалы',
        description: 'Короткие практики для запуска чувственности с утра.',
        order: 1,
        lessons: [
          {
            title: 'Телесная зарядка',
            summary: 'Пятиминутный разогрев тела и дыхание.',
            contentType: LessonContentType.VIDEO,
            order: 1,
            durationMinutes: 5,
            isPreview: true,
            content: {
              url: 'https://video.example.com/morning',
            },
          },
          {
            title: 'Дневник удовольствий',
            summary: 'Как фиксировать моменты удовольствия и формировать новые привычки.',
            contentType: LessonContentType.TEXT,
            order: 2,
            durationMinutes: 10,
            content: {
              worksheet: 'https://files.example.com/pleasure-journal.pdf',
            },
          },
        ],
      },
    ],
  },
  {
    slug: 'men-and-women',
    title: 'Men & Women',
    shortDescription: 'Разбираем отличия и точки пересечения мужской и женской сексуальности.',
    description:
      'Курс про понимание динамики отношений, сценариев и ожиданий. Помогает партнёрам настроить диалог и построить общую архитектуру удовольствия.',
    coverImageUrl:
      'https://i.postimg.cc/QCqq0Q9D/Dizajn-bez-nazvania-6-removebg-preview.png',
    promoVideoUrl: null,
    category: CourseCategory.MEN_WOMEN,
    level: CourseLevel.INTERMEDIATE,
    priceAmount: 5500,
    priceCurrency: Currency.EUR,
    isFree: false,
    modules: [
      {
        title: 'Сценарии и ожидания',
        description: 'Какие мифы живут в обществе и как они влияют на нас.',
        order: 1,
        lessons: [
          {
            title: 'Мифология сексуальности',
            summary: 'Разбираем популярные мифы и их последствия.',
            contentType: LessonContentType.TEXT,
            order: 1,
            durationMinutes: 25,
            content: {
              highlights: [
                'Миф о “нормальности”',
                'Синдром отличницы',
                'Сценарии из медиа',
              ],
            },
          },
          {
            title: 'Диалог с партнёром',
            summary: 'Рабочие вопросы и упражнения для обсуждения в паре.',
            contentType: LessonContentType.TEXT,
            order: 2,
            durationMinutes: 20,
            content: {
              prompts: [
                'Что для тебя близость?',
                'Как выглядит идеальный вечер?',
                'О чём говорить сложно, но важно?',
              ],
            },
          },
        ],
      },
    ],
  },
];

const usersSeed = [
  {
    id: '123456789',
    firstName: 'Катерина',
    lastName: 'Мур',
    username: 'mur_admin',
    languageCode: 'ru',
    isAdmin: true,
    timezone: 'Europe/Podgorica',
    avatarUrl:
      'https://i.postimg.cc/fyBsSydg/portrait-1.png',
  },
  {
    id: '555666777',
    firstName: 'Анастасия',
    username: 'anastasia_demo',
    languageCode: 'ru',
    timezone: 'Europe/Moscow',
    avatarUrl:
      'https://i.postimg.cc/52rv7FpC/portrait-2.png',
  },
];

async function seedCourses() {
  for (const course of coursesSeed) {
    await prisma.course.upsert({
      where: { slug: course.slug },
      update: {
        title: course.title,
        shortDescription: course.shortDescription,
        description: course.description,
        coverImageUrl: course.coverImageUrl,
        promoVideoUrl: course.promoVideoUrl,
        category: course.category,
        level: course.level,
        priceAmount: course.priceAmount,
        priceCurrency: course.priceCurrency,
        isFree: course.isFree,
        isPublished: true,
        publishedAt: new Date(),
        modules: {
          deleteMany: {},
          create: course.modules.map((module) => ({
            title: module.title,
            description: module.description,
            order: module.order,
            lessons: {
              create: module.lessons.map((lesson) => ({
                title: lesson.title,
                summary: lesson.summary,
                contentType: lesson.contentType,
                order: lesson.order,
                durationMinutes: lesson.durationMinutes,
                content: lesson.content,
                isPreview: lesson.isPreview ?? false,
              })),
            },
          })),
        },
      },
      create: {
        slug: course.slug,
        title: course.title,
        shortDescription: course.shortDescription,
        description: course.description,
        coverImageUrl: course.coverImageUrl,
        promoVideoUrl: course.promoVideoUrl,
        category: course.category,
        level: course.level,
        priceAmount: course.priceAmount,
        priceCurrency: course.priceCurrency,
        isFree: course.isFree,
        isPublished: true,
        publishedAt: new Date(),
        modules: {
          create: course.modules.map((module) => ({
            title: module.title,
            description: module.description,
            order: module.order,
            lessons: {
              create: module.lessons.map((lesson) => ({
                title: lesson.title,
                summary: lesson.summary,
                contentType: lesson.contentType,
                order: lesson.order,
                durationMinutes: lesson.durationMinutes,
                content: lesson.content,
                isPreview: lesson.isPreview ?? false,
              })),
            },
          })),
        },
      },
    });
  }
}

async function seedUsers() {
  for (const user of usersSeed) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        languageCode: user.languageCode,
        timezone: user.timezone,
        isAdmin: user.isAdmin ?? false,
        avatarUrl: user.avatarUrl ?? null,
      },
      create: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        languageCode: user.languageCode,
        timezone: user.timezone,
        isAdmin: user.isAdmin ?? false,
        avatarUrl: user.avatarUrl ?? null,
      },
    });
  }
}

async function seedEnrollments() {
  const mainUser = await prisma.user.findUnique({ where: { id: '555666777' } });
  if (!mainUser) return;

  const courses = await prisma.course.findMany({ where: { slug: { in: ['azbuka-seksa', 'eros-every-day'] } } });

  for (const course of courses) {
    await prisma.courseEnrollment.upsert({
      where: {
        userId_courseId: {
          userId: mainUser.id,
          courseId: course.id,
        },
      },
      update: {
        status: CourseAccessStatus.ACTIVE,
        accessType: course.isFree ? CourseAccessType.FREE : CourseAccessType.PURCHASED,
        activatedAt: new Date(),
      },
      create: {
        userId: mainUser.id,
        courseId: course.id,
        status: CourseAccessStatus.ACTIVE,
        accessType: course.isFree ? CourseAccessType.FREE : CourseAccessType.PURCHASED,
        activatedAt: new Date(),
        pricePaid: course.priceAmount,
        priceCurrency: course.priceCurrency,
        paymentStatus: course.isFree ? null : PaymentStatus.PAID,
      },
    });
  }
}

async function seedProgress() {
  const enrollment = await prisma.courseEnrollment.findFirst({
    where: {
      userId: '555666777',
      course: {
        slug: 'azbuka-seksa',
      },
    },
  });

  if (!enrollment) return;

  const lessons = await prisma.lesson.findMany({
    where: {
      module: {
        course: {
          slug: 'azbuka-seksa',
        },
      },
    },
    orderBy: { order: 'asc' },
    take: 2,
  });

  for (const [index, lesson] of lessons.entries()) {
    await prisma.courseProgress.upsert({
      where: {
        userId_lessonId: {
          userId: enrollment.userId,
          lessonId: lesson.id,
        },
      },
      update: {
        status: index === lessons.length - 1 ? LessonProgressStatus.IN_PROGRESS : LessonProgressStatus.COMPLETED,
        progressPercent: index === lessons.length - 1 ? 30 : 100,
        startedAt: new Date(),
        completedAt: index === lessons.length - 1 ? null : new Date(),
        lastViewedAt: new Date(),
      },
      create: {
        userId: enrollment.userId,
        lessonId: lesson.id,
        status: index === lessons.length - 1 ? LessonProgressStatus.IN_PROGRESS : LessonProgressStatus.COMPLETED,
        progressPercent: index === lessons.length - 1 ? 30 : 100,
        startedAt: new Date(),
        completedAt: index === lessons.length - 1 ? null : new Date(),
        lastViewedAt: new Date(),
      },
    });
  }
}

async function seedReminders() {
  await prisma.reminderSetting.upsert({
    where: { userId: '555666777' },
    update: {
      frequency: ReminderFrequency.DAILY,
      timeOfDay: ReminderTimeOfDay.MORNING,
      isEnabled: true,
    },
    create: {
      userId: '555666777',
      frequency: ReminderFrequency.DAILY,
      timeOfDay: ReminderTimeOfDay.MORNING,
      isEnabled: true,
    },
  });
}

async function seedReviews() {
  const course = await prisma.course.findUnique({ where: { slug: 'azbuka-seksa' } });
  if (!course) return;

  await prisma.courseReview.upsert({
    where: {
      courseId_userId: {
        courseId: course.id,
        userId: '555666777',
      },
    },
    update: {
      rating: 5,
      content: 'Очень тёплый и глубокий курс. Практики легко встроить в рутину.',
      status: ReviewStatus.PUBLISHED,
    },
    create: {
      courseId: course.id,
      userId: '555666777',
      rating: 5,
      content: 'Очень тёплый и глубокий курс. Практики легко встроить в рутину.',
      status: ReviewStatus.PUBLISHED,
    },
  });
}

async function seedActivityLog() {
  await prisma.activityLog.create({
    data: {
      actorId: '555666777',
      actorType: ActivityActorType.USER,
      action: 'seed:enrollment.created',
      metadata: {
        courseSlug: 'azbuka-seksa',
        note: 'Демонстрационный доступ создан сидом',
      },
    },
  });
}

async function main() {
  await seedCourses();
  await seedUsers();
  await seedEnrollments();
  await seedProgress();
  await seedReminders();
  await seedReviews();
  await seedActivityLog();
}

main()
  .then(async () => {
    // eslint-disable-next-line no-console
    console.log('Database has been seeded 🌱');
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    // eslint-disable-next-line no-console
    console.error('Seed failed', error);
    await prisma.$disconnect();
    process.exit(1);
  });

