function normalizeBaseUrl(rawValue: string | undefined) {
  let base = rawValue?.trim();
  if (!base || base.length === 0) {
    base =
      process.env.NODE_ENV === "production"
        ? "https://api.murmurmne.com"
        : "http://localhost:4000";
  }

  if (!/^https?:\/\//i.test(base)) {
    base = `http://${base}`;
  }

  return base.replace(/\.+$/, "").replace(/\/+$/, "");
}

// Используем прокси-роут для безопасной передачи API key
function buildUrl(path: string) {
  // Убираем ведущий слэш, если есть
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  // Используем прокси-роут вместо прямого обращения к API
  return `/api/proxy/${cleanPath}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...init?.headers,
  };

  const response = await fetch(buildUrl(path), {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? "";
    let message: string;
    if (contentType.includes("application/json")) {
      try {
        const data = (await response.json()) as { message?: unknown } | null;
        message =
          typeof data?.message === "string"
            ? data.message
            : JSON.stringify(data);
      } catch {
        message = await response.text();
      }
    } else {
      message = await response.text();
    }

    throw new Error(message || `Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

async function uploadImage(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("file", file);

  // Для загрузки файлов используем прокси, но нужно обработать FormData
  // Создаем специальный endpoint для загрузки файлов
  const response = await fetch("/api/proxy/uploads/images", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      `Upload to /uploads/images failed with ${response.status}: ${message}`,
    );
  }

  return (await response.json()) as { url: string };
}

export type OverviewMetrics = {
  activeUsers: number;
  revenueCents: number;
  courseCount: number;
  averageProgressPercent: number;
  visitsLast30Days: number;
};

export type CourseSummary = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string | null;
  coverImageUrl: string | null;
  category: string;
  language?: string;
  isPublished?: boolean;
  priceAmount: number;
  priceCurrency: string;
  isFree: boolean;
  level?: string;
  _count?: {
    modules: number;
    enrollments: number;
  };
};

export type CourseDetails = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string | null;
  description: string | null;
  coverImageUrl: string | null;
  promoVideoUrl: string | null;
  category: string;
  language: string;
  level: string;
  isFree: boolean;
  isPublished: boolean;
  priceAmount: number;
  priceCurrency: string;
  modules: Array<{
    id: string;
    title: string;
    description: string | null;
    order: number;
    lessons: Array<{
      id: string;
      title: string;
      summary: string | null;
      content: unknown;
      durationMinutes: number | null;
      contentType: string;
      videoUrl: string | null;
      order: number;
      isPreview: boolean;
    }>;
  }>;
  tests: Array<{
    id: string;
    title: string;
    description: string | null;
    questions: unknown;
    unlockModuleId: string | null;
    unlockLessonId: string | null;
    unlockModule?: {
      id: string;
      title: string;
    } | null;
    unlockLesson?: {
      id: string;
      title: string;
      module?: {
        title: string | null;
      } | null;
    } | null;
  }>;
  forms: Array<{
    id: string;
    title: string;
    description: string | null;
    type?: "CHOICE" | "RATING" | "SCORED";
    maxRating?: number | null;
    questions: unknown;
    results: unknown;
    lessonId: string | null;
    unlockModuleId: string | null;
    unlockLessonId: string | null;
  }>;
};

export type CourseAccessCode = {
  id: string;
  code: string;
  status: string;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
  activatedAt: string | null;
  activatedBy?: {
    id: string;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null;
};

export type CreateAccessCodePayload = {
  note?: string | null;
  createdBy?: string | null;
};

export type CoursePayload = {
  title: string;
  slug: string;
  shortDescription?: string | null;
  description?: string | null;
  coverImageUrl?: string | null;
  promoVideoUrl?: string | null;
  category: string;
  language: string;
  level?: string;
  priceAmount: number;
  priceCurrency: string;
  isFree: boolean;
  isPublished: boolean;
  modules?: CourseModulePayload[];
  tests?: CourseTestPayload[];
  forms?: CourseFormPayload[];
};

export type LessonPayload = {
  id?: string;
  title: string;
  summary?: string | null;
  content?: unknown;
  contentType?: string;
  videoUrl?: string | null;
  durationMinutes?: number | null;
  order: number;
  isPreview?: boolean;
};

export type CourseModulePayload = {
  id?: string;
  title: string;
  description?: string | null;
  order: number;
  lessons?: LessonPayload[];
};

export type CourseTestPayload = {
  title: string;
  description?: string | null;
  questions?: unknown;
  unlockModuleId?: string | null;
  unlockLessonId?: string | null;
};

export type CourseFormPayload = {
  title: string;
  description?: string | null;
  type?: "CHOICE" | "RATING" | "SCORED";
  maxRating?: number | null;
  questions?: unknown;
  results?: unknown;
  unlockModuleId?: string | null;
  unlockLessonId?: string | null;
};

export type UserDetail = UserSummary & {
  reminderSetting?: {
    frequency: string;
    timeOfDay: string;
    isEnabled: boolean;
  } | null;
  enrollments: Array<{
    id: string;
    status: string;
    course: {
      id: string;
      slug: string;
      title: string;
      category: string;
    };
  }>;
};

export type UserEnrollment = {
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
  lastViewedAt: string | null;
  activatedAt: string | null;
  lessonProgress: Array<{
    lessonId: string;
    status: string;
    progressPercent: number;
    lastViewedAt: string | null;
    completedAt: string | null;
  }>;
};

export type UserEnrollmentsResponse = {
  enrollments: UserEnrollment[];
  reminder: {
    frequency: string;
    timeOfDay: string;
    isEnabled: boolean;
  } | null;
};

export type ReminderPayload = {
  frequency: string;
  timeOfDay: string;
  isEnabled: boolean;
};

export type ProgressPayload =
  | {
      courseId: string;
      action: "complete" | "reset";
    }
  | {
      courseId: string;
      lessonId: string;
      action: "lesson";
      status?: string;
      progressPercent?: number;
    };

export type TopCourse = {
  id: string;
  title: string;
  slug: string;
  enrollments: number;
  reviews: number;
  revenueCents: number;
  priceAmount: number;
  priceCurrency: string;
  isFree: boolean;
};

export type ActivityLogItem = {
  id: string;
  action: string;
  createdAt: string;
  metadata: Record<string, unknown> | null;
  actor: { id: string; name: string } | null;
  course: { id: string; title: string; slug: string } | null;
};

export type UserSummary = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  avatarUrl: string | null;
  languageCode: string | null;
  isAdmin: boolean;
  createdAt: string;
  lastSeenAt: string | null;
  timezone: string | null;
  coursesCount: number;
  activeCourses: number;
  reminder: {
    frequency: string;
    timeOfDay: string;
    isEnabled: boolean;
  } | null;
};

function formatCurrency(cents: number, currency: string) {
  if (cents <= 0) {
    return "€0";
  }

  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export const apiClient = {
  getOverview: () => request<OverviewMetrics>("/analytics/overview"),
  getTopCourses: () => request<TopCourse[]>("/analytics/top-courses"),
  getActivity: () => request<ActivityLogItem[]>("/analytics/activity"),
  getCourses: () => request<CourseSummary[]>("/courses"),
  getCourse: (idOrSlug: string) =>
    request<CourseDetails>(`/courses/${idOrSlug}`),
  createCourse: (payload: CoursePayload) =>
    request<CourseDetails>("/courses", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateCourse: (idOrSlug: string, payload: CoursePayload) =>
    request<CourseDetails>(`/courses/${idOrSlug}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteCourse: (idOrSlug: string) =>
    request<{ status: string }>(`/courses/${idOrSlug}`, {
      method: "DELETE",
    }),
  getCourseAccessCodes: (idOrSlug: string) =>
    request<CourseAccessCode[]>(`/courses/${idOrSlug}/access-codes`),
  createCourseAccessCode: (
    idOrSlug: string,
    payload: CreateAccessCodePayload,
  ) =>
    request<CourseAccessCode>(`/courses/${idOrSlug}/access-codes`, {
      method: "POST",
      body: JSON.stringify(payload ?? {}),
    }),
  uploadImage,
  getUsers: () => request<UserSummary[]>("/users"),
  getUser: (id: string) => request<UserDetail>(`/users/${id}`),
  getUserEnrollments: (id: string) =>
    request<UserEnrollmentsResponse>(`/users/${id}/enrollments`),
  updateReminder: (userId: string, payload: ReminderPayload) =>
    request(`/users/${userId}/reminder`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  updateProgress: (userId: string, payload: ProgressPayload) =>
    request(`/users/${userId}/progress`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};

export const formatRevenue = formatCurrency;

