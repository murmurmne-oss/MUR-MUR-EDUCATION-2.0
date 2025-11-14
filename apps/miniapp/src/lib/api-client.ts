export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

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

const API_BASE_URL = normalizeBaseUrl(
  process.env.NEXT_PUBLIC_API_BASE_URL,
);

function buildUrl(path: string) {
  if (!path.startsWith("/")) {
    return `${API_BASE_URL}/${path}`;
  }
  return `${API_BASE_URL}${path}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(buildUrl(path), {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
      cache: "no-store",
    });
  } catch (networkError) {
    throw new ApiError(
      "Не удалось подключиться к серверу. Проверьте интернет и попробуйте ещё раз.",
      0,
      networkError,
    );
  }

  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? "";
    let parsedBody: unknown = null;
    let rawMessage = "";

    if (contentType.includes("application/json")) {
      try {
        parsedBody = (await response.json()) as { message?: unknown } | null;
        rawMessage =
          typeof (parsedBody as { message?: unknown } | null)?.message === "string"
            ? ((parsedBody as { message?: unknown } | null)?.message as string)
            : JSON.stringify(parsedBody);
      } catch {
        rawMessage = await response.text();
      }
    } else {
      rawMessage = await response.text();
    }

    const friendlyMessage =
      response.status >= 500
        ? "Сервер временно недоступен. Попробуйте повторить запрос позже."
        : rawMessage || `Запрос завершился с ошибкой ${response.status}.`;

    throw new ApiError(friendlyMessage, response.status, parsedBody ?? rawMessage);
  }

  try {
    return (await response.json()) as T;
  } catch (parseError) {
    throw new ApiError(
      "Сервер вернул неожиданный ответ. Обновите страницу и попробуйте снова.",
      response.status,
      parseError,
    );
  }
}

export type CatalogCourse = {
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

export type CatalogCategory = {
  id: string;
  label: string;
  description: string;
  courses: CatalogCourse[];
};

export type CourseDetails = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  shortDescription: string | null;
  coverImageUrl: string | null;
  promoVideoUrl: string | null;
  category: string;
  level: string;
  isFree: boolean;
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
  reviews: Array<{
    id: string;
    rating: number;
    content: string | null;
    createdAt: string;
  }>;
  _count: {
    enrollments: number;
    reviews: number;
  };
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

export type EnrollCoursePayload = {
  userId: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  languageCode?: string | null;
  avatarUrl?: string | null;
};

export type UpdateLessonProgressPayload = {
  courseId: string;
  lessonId: string;
  action: "lesson";
  status?: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  progressPercent?: number;
};

export type PublicTestQuestionOption = {
  id: string;
  text: string;
};

export type PublicTestQuestion = {
  id: string;
  order: number;
  type: "single" | "multiple" | "open";
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

export type StartTestPayload = {
  userId: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  languageCode?: string | null;
  avatarUrl?: string | null;
};

export type StartTestResponse = {
  attemptId: string;
  test: PublicTest;
};

export type SubmitTestAnswer = {
  questionId: string;
  selectedOptionIds?: string[];
  textAnswer?: string;
};

export type SubmitTestPayload = {
  attemptId: string;
  answers: SubmitTestAnswer[];
};

export type SubmitTestResult = {
  attemptId: string;
  score: number;
  maxScore: number;
  percent: number;
  answers: Array<{
    questionId: string;
    correct: boolean | null;
    selectedOptionIds?: string[];
    correctOptionIds?: string[];
    textAnswer?: string;
    expectedAnswer?: string | null;
    explanation?: string | null;
  }>;
};

export type TelegramStarsInvoiceUser = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  languageCode?: string | null;
  avatarUrl?: string | null;
};

export type SendTelegramStarsInvoicePayload = {
  courseSlug: string;
  user: TelegramStarsInvoiceUser;
};

export type UserProfile = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  avatarUrl: string | null;
  languageCode: string | null;
};

export type SyncUserPayload = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  languageCode?: string | null;
};

export const apiClient = {
  getCatalog: () => request<CatalogCategory[]>("/catalog"),
  getCourse: (idOrSlug: string) =>
    request<CourseDetails>(`/courses/${idOrSlug}`),
  getUserEnrollments: (userId: string) =>
    request<UserEnrollmentsResponse>(`/users/${userId}/enrollments`),
  getUserProfile: (userId: string) =>
    request<UserProfile>(`/users/${userId}`),
  syncUserProfile: (payload: SyncUserPayload) =>
    request<UserProfile>(`/users/sync`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  enrollCourse: (idOrSlug: string, payload: EnrollCoursePayload) =>
    request<{ status: string }>(`/courses/${idOrSlug}/enroll`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateLessonProgress: (
    userId: string,
    payload: UpdateLessonProgressPayload,
  ) =>
    request<{ status: string }>(`/users/${userId}/progress`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  startCourseTest: (
    idOrSlug: string,
    testId: string,
    payload: StartTestPayload,
  ) =>
    request<StartTestResponse>(`/courses/${idOrSlug}/tests/${testId}/start`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  submitCourseTest: (
    idOrSlug: string,
    testId: string,
    payload: SubmitTestPayload,
  ) =>
    request<SubmitTestResult>(`/courses/${idOrSlug}/tests/${testId}/submit`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  sendTelegramStarsInvoice: (payload: SendTelegramStarsInvoicePayload) =>
    request<{ status: string }>(`/payments/telegram-stars/send-invoice`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};

export function formatPrice(amount: number, currency: string) {
  if (amount <= 0) {
    return "Бесплатно";
  }

  if (currency === "TELEGRAM_STAR") {
    return `${amount} ⭐`;
  }

  try {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount / 100);
  } catch {
    return `${amount / 100} ${currency}`;
  }
}

