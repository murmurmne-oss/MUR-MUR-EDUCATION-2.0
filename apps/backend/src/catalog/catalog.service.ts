import { Injectable } from '@nestjs/common';
import { CourseCategory, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type CatalogCourse = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string | null;
  coverImageUrl: string | null;
  isFree: boolean;
  price: {
    amount: number;
    currency: string;
  };
  stats: {
    moduleCount: number;
    lessonCount: number;
    enrollmentCount: number;
  };
};

type CatalogResponse = Array<{
  id: CourseCategory;
  label: string;
  description: string;
  courses: CatalogCourse[];
}>;

const CATEGORY_META: Record<
  CourseCategory,
  { label: string; description: string }
> = {
  [CourseCategory.EROS_EVERY_DAY]: {
    label: 'Eros & every day',
    description:
      'Ежедневные практики, ритуалы и микровнимание к телу и эмоциям.',
  },
  [CourseCategory.MEN_WOMEN]: {
    label: 'Men & Women',
    description: 'Курсы о динамике отношений и взаимопонимании партнёров.',
  },
  [CourseCategory.PSYCHOSEXUALITY]: {
    label: 'Psychosexuality',
    description:
      'Глубокие программы о психоэмоциональной стороне сексуальности.',
  },
};

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async getCatalog(): Promise<CatalogResponse> {
    const courses = await this.prisma.course.findMany({
      where: { isPublished: true },
      orderBy: { title: Prisma.SortOrder.asc },
      include: {
        modules: {
          include: {
            lessons: true,
          },
        },
        _count: {
          select: {
            modules: true,
            enrollments: true,
          },
        },
      },
    });

    const grouped = new Map<CourseCategory, CatalogCourse[]>();

    for (const course of courses) {
      const moduleCount = course.modules.length;
      const lessonCount = course.modules.reduce(
        (acc, module) => acc + module.lessons.length,
        0,
      );

      const courseEntry: CatalogCourse = {
        id: course.id,
        slug: course.slug,
        title: course.title,
        shortDescription: course.shortDescription,
        coverImageUrl: course.coverImageUrl,
        isFree: course.isFree,
        price: {
          amount: course.priceAmount,
          currency: course.priceCurrency,
        },
        stats: {
          moduleCount,
          lessonCount,
          enrollmentCount: course._count.enrollments,
        },
      };

      const current = grouped.get(course.category) ?? [];
      current.push(courseEntry);
      grouped.set(course.category, current);
    }

    return Array.from(grouped.entries()).map(([category, coursesList]) => ({
      id: category,
      label: CATEGORY_META[category].label,
      description: CATEGORY_META[category].description,
      courses: coursesList,
    }));
  }
}

