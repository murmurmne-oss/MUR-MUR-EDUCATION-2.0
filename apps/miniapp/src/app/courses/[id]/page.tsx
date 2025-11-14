"use client";

import {
  startTransition,
  use,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  apiClient,
  CourseDetails,
  EnrollCoursePayload,
  StartTestPayload,
  StartTestResponse,
  SubmitTestPayload,
  SubmitTestResult,
  formatPrice,
} from "@/lib/api-client";
import { extractPlainText, parseLessonBlocks } from "@/lib/lesson-content";
import { useTelegram } from "@/hooks/useTelegram";

const DEV_USER_ID =
  process.env.NEXT_PUBLIC_DEV_USER_ID ?? "555666777";

const RAW_STARS_PER_EURO = Number(
  process.env.NEXT_PUBLIC_TELEGRAM_STARS_PER_EURO ?? "60",
);
const STARS_PER_EURO =
  Number.isFinite(RAW_STARS_PER_EURO) && RAW_STARS_PER_EURO > 0
    ? RAW_STARS_PER_EURO
    : null;
const MIN_STARS_AMOUNT = 1;

function calculateStarsAmount(course: CourseDetails): number | null {
  if (course.isFree) {
    return null;
  }

  if (course.priceCurrency === "TELEGRAM_STAR") {
    return Math.max(MIN_STARS_AMOUNT, course.priceAmount);
  }

  if (course.priceCurrency === "EUR") {
    if (!STARS_PER_EURO) {
      console.warn(
        "[payments] NEXT_PUBLIC_TELEGRAM_STARS_PER_EURO is not configured; unable to convert EUR to Stars.",
      );
      return null;
    }
    const euroValue = course.priceAmount / 100;
    return Math.max(MIN_STARS_AMOUNT, Math.round(euroValue * STARS_PER_EURO));
  }

  return null;
}

export default function CourseDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const courseId = resolvedParams.id;
  const [course, setCourse] = useState<CourseDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const { user: tgUser, webApp, supportsStarPayment } = useTelegram();
  const resolvedUserId = useMemo(
    () =>
      tgUser?.id && Number.isFinite(Number(tgUser.id))
        ? tgUser.id.toString()
        : DEV_USER_ID,
    [tgUser],
  );
  const userProfilePayload = useMemo<StartTestPayload>(
    () => ({
      userId: resolvedUserId,
      firstName: tgUser?.first_name ?? null,
      lastName: tgUser?.last_name ?? null,
      username: tgUser?.username ?? null,
      languageCode: tgUser?.language_code ?? null,
      avatarUrl: tgUser?.photo_url ?? null,
    }),
    [resolvedUserId, tgUser],
  );
  const [pendingTestId, setPendingTestId] = useState<string | null>(null);
  const [isTestLoading, setIsTestLoading] = useState(false);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [testSession, setTestSession] = useState<StartTestResponse | null>(
    null,
  );
  const [testAnswers, setTestAnswers] = useState<
    Record<string, string[] | string>
  >({});
  const [testResult, setTestResult] = useState<SubmitTestResult | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [isTestSubmitting, setIsTestSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    startTransition(() => setIsLoading(true));
    apiClient
      .getCourse(courseId)
      .then((data) => {
        if (!active) return;
        startTransition(() => {
          setCourse(data);
          setError(null);
        });
      })
      .catch((courseError: unknown) => {
        console.error("Failed to load course", courseError);
        if (!active) return;
        startTransition(() => {
          setError("Мы не смогли найти этот курс. Попробуйте позже.");
        });
      })
      .finally(() => {
        if (active) {
          startTransition(() => setIsLoading(false));
        }
      });

    return () => {
      active = false;
    };
  }, [courseId]);

  const lessonsCount = useMemo(() => {
    if (!course) return 0;
    return course.modules.reduce(
      (sum, module) => sum + module.lessons.length,
      0,
    );
  }, [course]);

  const priceAmountInStars = useMemo(() => {
    if (!course) {
      return null;
    }
    return calculateStarsAmount(course);
  }, [course]);

  const priceLabel = useMemo(() => {
    if (!course) return "";
    if (course.isFree) {
      return "Бесплатно";
    }
    const baseLabel = formatPrice(course.priceAmount, course.priceCurrency);
    if (
      priceAmountInStars &&
      course.priceCurrency !== "TELEGRAM_STAR"
    ) {
      return `${baseLabel} · ${priceAmountInStars} ⭐`;
    }
    return baseLabel;
  }, [course, priceAmountInStars]);

  const isPaidCourse = useMemo(
    () => Boolean(course && !course.isFree),
    [course],
  );

  const canUseTelegramStars = useMemo(() => {
    if (!isPaidCourse) {
      return true;
    }
    if (!priceAmountInStars) {
      return false;
    }
    return (
      supportsStarPayment && typeof webApp?.initStarPayment === "function"
    );
  }, [isPaidCourse, priceAmountInStars, supportsStarPayment, webApp]);

  const actionDisabled =
    isLoading || isEnrolling || (isPaidCourse && !canUseTelegramStars);

  const paymentDisabledReason = useMemo(() => {
    if (!course) {
      return null;
    }

    if (!course) {
      return null;
    }

    if (!course.isFree && !priceAmountInStars) {
      if (course.priceCurrency === "EUR") {
        return "Не удалось конвертировать стоимость курса в Telegram Stars. Проверьте настройку курса конвертации.";
      }
      return "Оплата для этого курса появится позже. Следите за обновлениями.";
    }

    if (!course.isFree && !canUseTelegramStars) {
      return "Обновите приложение Telegram до последней версии, чтобы оплатить через Stars.";
    }

    return null;
  }, [course, priceAmountInStars, canUseTelegramStars]);

  const resetTestState = () => {
    setTestSession(null);
    setTestAnswers({});
    setTestResult(null);
    setTestError(null);
    setIsTestDialogOpen(false);
  };

  const handleStartTest = async (testId: string) => {
    if (!course) return;
    setPendingTestId(testId);
    setIsTestLoading(true);
    setTestError(null);
    try {
      const session = await apiClient.startCourseTest(
        course.slug,
        testId,
        userProfilePayload,
      );
      const initialAnswers: Record<string, string[] | string> = {};
      session.test.questions.forEach((question) => {
        initialAnswers[question.id] =
          question.type === "open" ? "" : ([] as string[]);
      });
      setTestSession(session);
      setTestAnswers(initialAnswers);
      setTestResult(null);
      setIsTestDialogOpen(true);
    } catch (startError) {
      console.error("Failed to start test", startError);
      setTestError(
        startError instanceof Error
          ? startError.message
          : "Не удалось начать тест. Попробуйте позже.",
      );
    } finally {
      setPendingTestId(null);
      setIsTestLoading(false);
    }
  };

  const handleToggleOption = (
    questionId: string,
    optionId: string,
    type: "single" | "multiple",
  ) => {
    setTestAnswers((prev) => {
      if (type === "single") {
        return {
          ...prev,
          [questionId]: [optionId],
        };
      }

      const current = Array.isArray(prev[questionId])
        ? [...(prev[questionId] as string[])]
        : [];
      const next = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];

      return {
        ...prev,
        [questionId]: next,
      };
    });
  };

  const handleTextAnswerChange = (questionId: string, value: string) => {
    setTestAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleSubmitTest = async () => {
    if (!course || !testSession) {
      return;
    }

    const unanswered = testSession.test.questions.filter((question) => {
      const answerValue = testAnswers[question.id];
      if (question.type === "open") {
        return (
          !answerValue ||
          (typeof answerValue === "string" && answerValue.trim().length === 0)
        );
      }

      const selected = Array.isArray(answerValue)
        ? (answerValue as string[])
        : [];
      return selected.length === 0;
    });

    if (unanswered.length > 0) {
      setTestError("Ответьте на все вопросы перед отправкой.");
      return;
    }

    const payload: SubmitTestPayload = {
      attemptId: testSession.attemptId,
      answers: testSession.test.questions.map((question) => {
        const value = testAnswers[question.id];
        if (question.type === "open") {
          return {
            questionId: question.id,
            textAnswer: typeof value === "string" ? value : "",
          };
        }

        const selected = Array.isArray(value) ? (value as string[]) : [];
        return {
          questionId: question.id,
          selectedOptionIds: selected,
        };
      }),
    };

    setIsTestSubmitting(true);
    setTestError(null);
    try {
      const result = await apiClient.submitCourseTest(
        course.slug,
        testSession.test.id,
        payload,
      );
      setTestResult(result);
    } catch (submitError) {
      console.error("Failed to submit test", submitError);
      setTestError(
        submitError instanceof Error
          ? submitError.message
          : "Не удалось отправить ответы. Попробуйте позже.",
      );
    } finally {
      setIsTestSubmitting(false);
    }
  };

  const handleCloseTest = () => {
    if (isTestSubmitting) return;
    resetTestState();
  };

  const handleEnroll = async () => {
    if (!course) return;

    setEnrollError(null);
    setPaymentStatus(null);

    if (!course.isFree) {
      if (!priceAmountInStars) {
        setEnrollError(
          "Не удалось рассчитать стоимость курса в Telegram Stars. Напишите в поддержку, если нужна помощь.",
        );
        return;
      }

      if (
        !supportsStarPayment ||
        typeof webApp?.initStarPayment !== "function"
      ) {
        setEnrollError(
          "Оплата через Telegram Stars пока недоступна в вашем Telegram. Обновите приложение и попробуйте снова.",
        );
        return;
      }

      const paymentPayload = {
        courseSlug: course.slug,
        userId: resolvedUserId,
        requestedAt: Date.now(),
        priceCurrency: course.priceCurrency,
        priceAmount: course.priceAmount,
        amountInStars: priceAmountInStars,
      };

      const requestPayload: Record<string, unknown> = {
        slug: course.slug,
        payload: JSON.stringify(paymentPayload),
        amount: priceAmountInStars,
        currency: "XTR",
      };

      if (course.title) {
        requestPayload.title = course.title;
      }
      const descriptionSource = course.shortDescription ?? course.description;
      if (descriptionSource) {
        requestPayload.description = descriptionSource.slice(0, 120);
      }
      if (course.coverImageUrl) {
        requestPayload.photo_url = course.coverImageUrl;
      }

      setIsEnrolling(true);
      try {
        await webApp.initStarPayment(requestPayload);
        const euroLabel = formatPrice(course.priceAmount, course.priceCurrency);
        setPaymentStatus(
          `Телеграм открыл окно оплаты на ${priceAmountInStars} ⭐ (${euroLabel}). После подтверждения доступ к курсу откроется автоматически.`,
        );
      } catch (paymentError) {
        console.error("Failed to init Telegram Stars payment", paymentError);
        setEnrollError(
          paymentError instanceof Error
            ? paymentError.message
            : "Не удалось запустить оплату. Попробуйте позже.",
        );
      } finally {
        setIsEnrolling(false);
      }
      return;
    }

    const payload: EnrollCoursePayload = { ...userProfilePayload };

    setIsEnrolling(true);
    try {
      await apiClient.enrollCourse(course.slug, payload);
      router.push("/my-courses");
    } catch (enrollErr) {
      console.error("Failed to enroll", enrollErr);
      setEnrollError(
        enrollErr instanceof Error
          ? enrollErr.message
          : "Не удалось начать курс. Попробуйте позже.",
      );
    } finally {
      setIsEnrolling(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col bg-background text-text-dark">
      <header className="space-y-2 px-4 pt-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-xs font-medium text-brand-orange underline-offset-4 hover:underline"
        >
          Назад ко всем курсам
        </button>
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-6 w-60 animate-pulse rounded-full bg-card" />
            <div className="h-4 w-40 animate-pulse rounded-full bg-card" />
          </div>
        ) : error ? (
          <p className="rounded-2xl bg-card px-4 py-3 text-sm text-brand-orange">
            {error}
          </p>
        ) : (
          <>
            <h1 className="text-2xl font-semibold">{course?.title}</h1>
            <p className="text-sm text-text-light">
              {course?.category ?? "Категория"}
            </p>
            <p className="text-xs text-text-light/70">
              {course?._count.enrollments ?? 0} учеников · {lessonsCount} уроков
            </p>
          </>
        )}
      </header>

      <main className="mt-6 flex flex-1 flex-col gap-6 px-4 pb-24">
        {course?.coverImageUrl ? (
          <div className="relative h-48 w-full overflow-hidden rounded-3xl">
            <Image
              src={course.coverImageUrl}
              alt={course.title}
              fill
              className="object-cover"
            />
          </div>
        ) : null}

        <section className="rounded-3xl bg-card p-5 text-sm text-text-medium shadow-sm">
          <h2 className="text-lg font-semibold text-text-dark">О курсе</h2>
          <p className="mt-3 leading-relaxed text-text-medium">
            {course?.description ??
              "Описание появится в ближайшее время. Если у вас есть вопросы, напишите в поддержку."}
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-text-dark">Программа</h2>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-14 animate-pulse rounded-2xl bg-card"
                />
              ))}
            </div>
          ) : (
            <ul className="space-y-3">
              {course?.modules.map((module) => (
                <li
                  key={module.id}
                  className="space-y-3 rounded-2xl border border-card bg-white px-4 py-3 text-sm text-text-medium"
                >
                  <div>
                    <p className="font-medium text-text-dark">{module.title}</p>
                    <p className="text-xs text-text-light">
                      {module.lessons.length} уроков
                    </p>
                    {module.description ? (
                      <p className="mt-1 text-xs text-text-light">
                        {module.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    {module.lessons.map((lesson) => {
                      const blocks = parseLessonBlocks(lesson.content);
                      const previewText =
                        lesson.summary && lesson.summary.length > 0
                          ? ""
                          : extractPlainText(lesson.content, 180);
                      return (
                        <div
                          key={lesson.id}
                          className="rounded-xl bg-surface px-3 py-2 text-xs text-text-medium"
                        >
                          <p className="font-medium text-text-dark">
                            {lesson.title}
                          </p>
                          {lesson.summary ? (
                            <p className="mt-1 text-text-light">
                              {lesson.summary}
                            </p>
                          ) : null}
                          {!lesson.summary && previewText ? (
                            <p className="mt-2 whitespace-pre-wrap text-text-medium">
                              {previewText}
                            </p>
                          ) : null}
                          {!lesson.summary && !previewText && blocks.length ? (
                            <ul className="mt-2 list-inside list-disc space-y-1 text-text-medium">
                              {blocks
                                .filter((block) => block.type === "heading")
                                .slice(0, 3)
                                .map((block, index) => (
                                  <li key={`${lesson.id}-heading-${index}`}>
                                    {(block as { text: string }).text}
                                  </li>
                                ))}
                            </ul>
                          ) : null}
                          {lesson.videoUrl ? (
                            <p className="mt-2 text-xs text-brand-orange">
                              Видео: {lesson.videoUrl}
                            </p>
                          ) : null}
                          <div className="mt-2 flex items-center gap-3 text-[11px] text-text-light">
                            <span>Тип: {lesson.contentType}</span>
                            {lesson.durationMinutes ? (
                              <span>{lesson.durationMinutes} мин</span>
                            ) : null}
                            {lesson.isPreview ? (
                              <span className="text-brand-pink">Превью</span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {course?.tests.length ? (
          <section className="space-y-3 rounded-3xl bg-card p-5 text-sm text-text-medium shadow-sm">
            <h2 className="text-lg font-semibold text-text-dark">
              Тесты
            </h2>
            <ul className="space-y-3">
              {course.tests.map((test) => {
                const isStarting = pendingTestId === test.id && isTestLoading;
                return (
                  <li
                    key={test.id}
                    className="space-y-2 rounded-2xl border border-card bg-white px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-text-dark">{test.title}</p>
                      {test.description ? (
                        <p className="text-xs text-text-light">
                          {test.description}
                        </p>
                      ) : null}
                      <p className="mt-2 text-xs text-text-light">
                        Вопросов:{" "}
                        {Array.isArray(test.questions)
                          ? test.questions.length
                          : "несколько"}
                      </p>
                      {test.unlockModuleId ? (
                        <p className="text-[11px] text-brand-orange/80">
                          Доступ после модуля: {test.unlockModule?.title ?? "указанный модуль"}
                        </p>
                      ) : null}
                      {test.unlockLessonId ? (
                        <p className="text-[11px] text-brand-orange/80">
                          Доступ после урока: {test.unlockLesson?.title ?? "указанный урок"}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleStartTest(test.id)}
                      disabled={isStarting || isTestSubmitting}
                      className="w-full rounded-full border border-brand-pink px-3 py-2 text-xs font-semibold text-brand-pink transition-colors hover:bg-brand-pink hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isStarting ? "Готовим тест..." : "Пройти тест"}
                    </button>
                  </li>
                );
              })}
            </ul>
            {testError && !isTestDialogOpen ? (
              <p className="rounded-2xl bg-brand-orange/10 px-3 py-2 text-xs text-brand-orange">
                {testError}
              </p>
            ) : null}
          </section>
        ) : null}

        {paymentStatus ? (
          <p className="rounded-2xl bg-brand-pink/10 px-4 py-2 text-xs text-brand-pink">
            {paymentStatus}
          </p>
        ) : null}
        {enrollError ? (
          <p className="rounded-2xl bg-brand-orange/10 px-4 py-2 text-xs text-brand-orange">
            {enrollError}
          </p>
        ) : null}
        {isTestDialogOpen && testSession ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8">
            <div className="flex max-h-[90vh] w-full max-w-md flex-col gap-4 overflow-hidden rounded-3xl bg-white p-5 shadow-xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-text-light">
                    Тест
                  </p>
                  <h3 className="text-lg font-semibold text-text-dark">
                    {testSession.test.title}
                  </h3>
                  <p className="text-xs text-text-light">
                    {testSession.test.questionCount} вопросов · максимум{" "}
                    {testSession.test.maxScore} баллов
                  </p>
                  {testSession.test.unlockModule ? (
                    <p className="text-[11px] text-brand-orange/80">
                      Требуется пройти модуль: {testSession.test.unlockModule.title}
                    </p>
                  ) : null}
                  {testSession.test.unlockLesson ? (
                    <p className="text-[11px] text-brand-orange/80">
                      Требуется пройти урок: {testSession.test.unlockLesson.title}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={handleCloseTest}
                  disabled={isTestSubmitting}
                  className="text-xs font-semibold text-brand-orange underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Закрыть
                </button>
              </div>

              {testResult ? (
                <div className="rounded-2xl bg-brand-pink/10 px-4 py-3 text-sm text-brand-pink">
                  Результат: {testResult.score}/{testResult.maxScore} •{" "}
                  {testResult.percent}%
                </div>
              ) : null}

              {testError ? (
                <p className="rounded-2xl bg-brand-orange/10 px-4 py-2 text-xs text-brand-orange">
                  {testError}
                </p>
              ) : null}

              <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                {testSession.test.questions.map((question) => {
                  const value = testAnswers[question.id];
                  const selected = Array.isArray(value)
                    ? (value as string[])
                    : [];
                  const userText =
                    typeof value === "string" ? value : "";
                  const evaluation = testResult?.answers.find(
                    (answer) => answer.questionId === question.id,
                  );
                  const isCorrect = evaluation?.correct;
                  return (
                    <div
                      key={question.id}
                      className="space-y-2 rounded-2xl border border-border/60 bg-surface px-4 py-3 text-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-text-light">
                            {question.type === "open"
                              ? "Свободный ответ"
                              : question.type === "multiple"
                                ? "Несколько вариантов"
                                : "Один вариант"}
                          </p>
                          <p className="font-semibold text-text-dark">
                            {question.prompt}
                          </p>
                        </div>
                        {isCorrect !== null && (
                          <span
                            className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                              isCorrect
                                ? "bg-brand-pink/10 text-brand-pink"
                                : "bg-brand-orange/10 text-brand-orange"
                            }`}
                          >
                            {isCorrect ? "Верно" : "Неверно"}
                          </span>
                        )}
                      </div>

                      {question.type === "open" ? (
                        <div className="space-y-2">
                          <textarea
                            value={userText}
                            onChange={(event) =>
                              handleTextAnswerChange(
                                question.id,
                                event.target.value,
                              )
                            }
                            rows={3}
                            placeholder="Запишите свой ответ"
                            disabled={Boolean(testResult)}
                            className="w-full rounded-2xl border border-border bg-white px-3 py-2 text-sm text-text-dark outline-none focus:border-brand-pink disabled:cursor-not-allowed disabled:opacity-60"
                          />
                          {evaluation?.expectedAnswer ? (
                            <p className="text-xs text-text-light">
                              Ожидаемый ответ:{" "}
                              <span className="font-medium text-text-dark">
                                {evaluation.expectedAnswer}
                              </span>
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {question.options?.map((option) => {
                            const optionSelected = selected.includes(option.id);
                            const optionCorrect = evaluation?.correctOptionIds
                              ? evaluation.correctOptionIds.includes(option.id)
                              : false;
                            return (
                              <label
                                key={option.id}
                                className={`flex items-center gap-3 rounded-2xl border border-border/60 bg-white px-3 py-2 text-sm ${
                                  optionCorrect
                                    ? "border-brand-pink bg-brand-pink/10"
                                    : optionSelected && !optionCorrect
                                      ? "border-brand-orange bg-brand-orange/10"
                                      : ""
                                }`}
                              >
                                <input
                                  type={
                                    question.type === "single"
                                      ? "radio"
                                      : "checkbox"
                                  }
                                  name={question.id}
                                  value={option.id}
                                  checked={optionSelected}
                                  disabled={Boolean(testResult)}
                                  onChange={() =>
                                    handleToggleOption(
                                      question.id,
                                      option.id,
                                      question.type === "multiple"
                                        ? "multiple"
                                        : "single",
                                    )
                                  }
                                  className="size-4 accent-brand-pink disabled:cursor-not-allowed"
                                />
                                <span>{option.text}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}

                      {evaluation?.explanation ? (
                        <p className="text-xs text-text-light">
                          Пояснение: {evaluation.explanation}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col gap-2">
                {!testResult ? (
                  <button
                    type="button"
                    onClick={handleSubmitTest}
                    disabled={isTestSubmitting}
                    className="w-full rounded-full bg-brand-pink px-4 py-3 text-sm font-semibold text-white shadow-sm transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isTestSubmitting ? "Отправляем..." : "Отправить ответы"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCloseTest}
                    className="w-full rounded-full bg-brand-pink px-4 py-3 text-sm font-semibold text-white shadow-sm transition-transform active:scale-95"
                  >
                    Закрыть
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </main>

      <footer className="fixed bottom-[76px] left-1/2 z-40 w-full max-w-md -translate-x-1/2 px-4">
        <div className="rounded-3xl bg-brand-pink px-5 py-4 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide">
                {course?.isFree
                  ? "Бесплатно"
                  : course?.priceCurrency === "TELEGRAM_STAR"
                    ? "Стоимость в звёздах"
                    : "Стоимость"}
              </p>
              <p className="text-lg font-semibold">
                {course ? priceLabel : "—"}
              </p>
            </div>
            <button
              type="button"
              onClick={handleEnroll}
              disabled={actionDisabled}
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-brand-orange transition-transform active:scale-95"
            >
              {isEnrolling
                ? "Подождите..."
                : course?.isFree
                  ? "Начать"
                  : "Оформить доступ"}
            </button>
          </div>
          {paymentDisabledReason ? (
            <p className="mt-2 text-center text-[11px] text-white/80">
              {paymentDisabledReason}
            </p>
          ) : null}
        </div>
      </footer>
    </div>
  );
}

