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

export const API_BASE_URL = normalizeBaseUrl(
  process.env.NEXT_PUBLIC_API_BASE_URL,
);

function buildUrl(path: string) {
  if (!path.startsWith("/")) {
    return `${API_BASE_URL}/${path}`;
  }
  return `${API_BASE_URL}${path}`;
}

/**
 * Normalizes image URLs - converts relative URLs to absolute using API base URL
 * Always uses https for api.murmurmne.com to avoid mixed content issues
 */
export function normalizeImageUrl(url: string | undefined | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  
  let normalized = trimmed;
  
  // If already absolute URL, ensure it uses https for api.murmurmne.com
  if (/^https?:\/\//i.test(trimmed)) {
    // Always force https for api.murmurmne.com to avoid mixed content
    if (trimmed.includes('api.murmurmne.com')) {
      normalized = trimmed.replace(/^http:/i, 'https:');
    } else {
      normalized = trimmed;
    }
  } else if (trimmed.startsWith('/')) {
    // If relative URL starting with /, prepend API base URL
    normalized = `${API_BASE_URL}${trimmed}`;
  } else {
    // Otherwise, treat as relative to API base
    normalized = `${API_BASE_URL}/${trimmed}`;
  }
  
  // Final check: ensure api.murmurmne.com always uses https
  if (normalized.includes('api.murmurmne.com')) {
    normalized = normalized.replace(/^http:/i, 'https:');
  }
  
  return normalized;
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
  language?: string;
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
  language?: string;
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
      order: number;
      lessons?: Array<{
        id: string;
      }>;
    } | null;
    unlockLesson?: {
      id: string;
      title: string;
      module?: {
        title: string | null;
      } | null;
    } | null;
    attempts?: Array<{
      id: string;
      status: string;
      score: number | null;
      maxScore: number | null;
      completedAt: string | null;
    }>;
  }>;
  reviews: Array<{
    id: string;
    rating: number;
    content: string | null;
    createdAt: string;
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

export type PublicFormQuestion = {
  id: string;
  text: string;
  options: Array<{
    id: string;
    text: string;
    category?: string;  // Для CHOICE форм
    score?: number;     // Для SCORED форм - баллы за вариант ответа
  }>;
};

export type PublicForm = {
  id: string;
  title: string;
  description: string | null;
  type: "CHOICE" | "RATING" | "SCORED";
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

export type StartFormPayload = {
  userId: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  languageCode?: string | null;
  avatarUrl?: string | null;
};

export type StartFormResponse = {
  attemptId: string;
  form: PublicForm;
};

export type SubmitFormPayload = {
  attemptId: string;
  responses: Record<string, string | string[]>; // questionId -> selected optionId(s) для CHOICE или rating (число как строка) для RATING
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

export type CreateTelegramStarsInvoiceResponse = {
  invoiceUrl: string;
  amountInStars: number;
};

export type RedeemCourseCodePayload = {
  courseSlug: string;
  code: string;
  userId: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  languageCode?: string | null;
  avatarUrl?: string | null;
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
  getCourse: (idOrSlug: string, userId?: string) => {
    const url = userId
      ? `/courses/${idOrSlug}?userId=${encodeURIComponent(userId)}`
      : `/courses/${idOrSlug}`;
    return request<CourseDetails>(url);
  },
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
  startCourseForm: (
    idOrSlug: string,
    formId: string,
    payload: StartFormPayload,
  ) =>
    request<StartFormResponse>(`/courses/${idOrSlug}/forms/${formId}/start`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  submitCourseForm: (
    idOrSlug: string,
    formId: string,
    payload: SubmitFormPayload,
  ) =>
    request<SubmitFormResult>(`/courses/${idOrSlug}/forms/${formId}/submit`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  createTelegramStarsInvoice: (
    payload: SendTelegramStarsInvoicePayload,
  ) =>
    request<CreateTelegramStarsInvoiceResponse>(
      `/payments/telegram-stars/invoice`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    ),
  sendTelegramStarsInvoice: (payload: SendTelegramStarsInvoicePayload) =>
    request<{ status: string }>(`/payments/telegram-stars/send-invoice`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  redeemCourseCode: (idOrSlug: string, payload: RedeemCourseCodePayload) =>
    request<{ status: string }>(`/courses/${idOrSlug}/redeem-code`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  redeemCodeByCode: (payload: RedeemCourseCodePayload) =>
    request<{ status: string; courseSlug: string }>(`/courses/redeem-code`, {
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

