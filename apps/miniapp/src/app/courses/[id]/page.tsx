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
  RedeemCourseCodePayload,
  StartTestPayload,
  StartTestResponse,
  SubmitTestPayload,
  SubmitTestResult,
  formatPrice,
} from "@/lib/api-client";
import { extractPlainText, parseLessonBlocks } from "@/lib/lesson-content";
import { useTelegram } from "@/hooks/useTelegram";
import { useUserProfile } from "@/hooks/useUserProfile";
import { createTranslator } from "@/lib/i18n";

const DEV_USER_ID =
  process.env.NEXT_PUBLIC_DEV_USER_ID ?? "555666777";
const MANAGER_CHAT_URL =
  process.env.NEXT_PUBLIC_MANAGER_CHAT_URL ?? "https://t.me/mur_mur_manager_bot";



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
  const [isPayingWithStars, setIsPayingWithStars] = useState(false);
  const [starsPaymentMessage, setStarsPaymentMessage] = useState<string | null>(
    null,
  );
  const [starsPaymentError, setStarsPaymentError] = useState<string | null>(null);
  const { user: tgUser, webApp, supportsStarPayment } = useTelegram();
  const resolvedUserId = useMemo(
    () =>
      tgUser?.id && Number.isFinite(Number(tgUser.id))
        ? tgUser.id.toString()
        : DEV_USER_ID,
    [tgUser],
  );
  const { profile } = useUserProfile(resolvedUserId);
  // Используем язык из профиля, если есть, иначе из localStorage, иначе 'sr'
  const preferredLanguage = profile?.languageCode ?? (typeof window !== 'undefined' ? localStorage.getItem('murmur_preferred_language') : null) ?? "sr";
  const managerLink = useMemo(() => {
    if (!MANAGER_CHAT_URL) {
      return null;
    }
    if (!course?.slug) {
      return MANAGER_CHAT_URL;
    }
    const payload = encodeURIComponent(`buy_${course.slug}`);
    const separator = MANAGER_CHAT_URL.includes("?") ? "&" : "?";
    if (MANAGER_CHAT_URL.includes("start=")) {
      return MANAGER_CHAT_URL;
    }
    return `${MANAGER_CHAT_URL}${separator}start=${payload}`;
  }, [course?.slug]);
  const { t } = useMemo(
    () => createTranslator(preferredLanguage),
    [preferredLanguage],
  );
  const userProfilePayload = useMemo<StartTestPayload>(
    () => ({
      userId: resolvedUserId,
      firstName: tgUser?.first_name ?? null,
      lastName: tgUser?.last_name ?? null,
      username: tgUser?.username ?? null,
      languageCode: profile?.languageCode ?? "sr",
      avatarUrl: tgUser?.photo_url ?? null,
    }),
    [profile?.languageCode, resolvedUserId, tgUser],
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
  const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);
  const [redeemCode, setRedeemCode] = useState("");
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [redeemSuccess, setRedeemSuccess] = useState<string | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);

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
          setError(t("Мы не смогли найти этот курс. Попробуйте позже."));
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
  }, [courseId, t]);

  const lessonsCount = useMemo(() => {
    if (!course) return 0;
    return course.modules.reduce(
      (sum, module) => sum + module.lessons.length,
      0,
    );
  }, [course]);

  const priceLabel = useMemo(() => {
    if (!course) return "";
    if (course.isFree) {
      return t("Бесплатно");
    }
    return formatPrice(course.priceAmount, course.priceCurrency);
  }, [course, t]);

  const isPaidCourse = useMemo(
    () => Boolean(course && !course.isFree),
    [course],
  );

  const actionDisabled = isLoading || isEnrolling;

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
          ? t(startError.message)
          : t("Не удалось начать тест. Попробуйте позже."),
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
      setTestError(t("Ответьте на все вопросы перед отправкой."));
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
          ? t(submitError.message)
          : t("Не удалось отправить ответы. Попробуйте позже."),
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
    if (!course || !course.isFree) {
      return;
    }

    const payload: EnrollCoursePayload = { ...userProfilePayload };

    setIsEnrolling(true);
    setEnrollError(null);
    try {
      await apiClient.enrollCourse(course.slug, payload);
      router.push("/my-courses");
    } catch (enrollErr) {
      console.error("Failed to enroll", enrollErr);
      setEnrollError(
        enrollErr instanceof Error
          ? t(enrollErr.message)
          : t("Не удалось начать курс. Попробуйте позже."),
      );
    } finally {
      setIsEnrolling(false);
    }
  };

  const handlePayWithStars = async () => {
    if (!course) return;
    if (!tgUser?.id) {
      setStarsPaymentError(
        t("Не удалось получить данные пользователя. Попробуйте ещё раз."),
      );
      return;
    }

    setStarsPaymentError(null);
    setStarsPaymentMessage(null);
    setIsPayingWithStars(true);

    const payload = {
      courseSlug: course.slug,
      user: {
        id: tgUser.id.toString(),
        firstName: tgUser.first_name ?? null,
        lastName: tgUser.last_name ?? null,
        username: tgUser.username ?? null,
        languageCode: profile?.languageCode ?? "sr",
        avatarUrl: tgUser.photo_url ?? null,
      },
    };

    try {
      if (supportsStarPayment && webApp?.openInvoice) {
        const { invoiceUrl } = await apiClient.createTelegramStarsInvoice(payload);
        webApp.openInvoice(invoiceUrl, (status) => {
          if (status === "paid") {
            setStarsPaymentMessage(
              t(
                "Оплата прошла успешно. Курс скоро появится в разделе «Мои курсы».",
              ),
            );
          } else if (status === "cancelled") {
            setStarsPaymentMessage(t("Оплата была отменена."));
          } else if (status === "failed") {
            setStarsPaymentError(
              t("Оплата не удалась. Попробуйте ещё раз или напишите менеджеру."),
            );
          }
        });
      } else {
        await apiClient.sendTelegramStarsInvoice(payload);
        setStarsPaymentMessage(
          t(
            "Мы отправили счёт в ваш Telegram. Оплатите его, и курс появится в разделе «Мои курсы».",
          ),
        );
      }
    } catch (starsError) {
      console.error("Failed to process Telegram Stars payment", starsError);
      setStarsPaymentError(
        starsError instanceof Error
          ? t(starsError.message)
          : t(
              "Не удалось запустить оплату в Telegram Stars. Попробуйте ещё раз или напишите менеджеру.",
            ),
      );
    } finally {
      setIsPayingWithStars(false);
    }
  };

  const handleOpenRedeemModal = () => {
    setRedeemCode("");
    setRedeemError(null);
    setRedeemSuccess(null);
    setIsRedeemModalOpen(true);
  };

  const handleCloseRedeemModal = () => {
    if (isRedeeming) return;
    setIsRedeemModalOpen(false);
  };

  const handleRedeemCodeSubmit = async () => {
    if (!course) return;
    const normalizedCode = redeemCode.trim();
    if (normalizedCode.length === 0) {
      setRedeemError(t("Введите код доступа"));
      return;
    }

    const payload: RedeemCourseCodePayload = {
      courseSlug: course.slug,
      code: normalizedCode,
      userId: resolvedUserId,
      firstName: tgUser?.first_name ?? null,
      lastName: tgUser?.last_name ?? null,
      username: tgUser?.username ?? null,
      languageCode: profile?.languageCode ?? "sr",
      avatarUrl: tgUser?.photo_url ?? null,
    };

    setIsRedeeming(true);
    setRedeemError(null);
    setRedeemSuccess(null);

    try {
      await apiClient.redeemCourseCode(course.slug, payload);
      setRedeemSuccess(
        t("Код активирован! Мы добавили курс в раздел «Мои курсы»."),
      );
      setTimeout(() => {
        setIsRedeemModalOpen(false);
        router.push("/my-courses");
      }, 1200);
    } catch (redeemErr) {
      console.error("Failed to redeem code", redeemErr);
      setRedeemError(
        redeemErr instanceof Error
          ? t(redeemErr.message)
          : t("Не удалось активировать код. Попробуйте снова."),
      );
    } finally {
      setIsRedeeming(false);
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
          {t("Назад ко всем курсам")}
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
              {course?.category ?? t("Категория")}
            </p>
            <p className="text-xs text-text-light/70">
              {t("{count} учеников · {lessons} уроков", {
                count: course?._count.enrollments ?? 0,
                lessons: lessonsCount,
              })}
            </p>
          </>
        )}
      </header>

      <main className="mt-6 flex flex-1 flex-col gap-6 px-4 pb-24">
        {course?.promoVideoUrl ? (
          <div className="relative overflow-hidden rounded-3xl bg-black/80">
            <video
              controls
              playsInline
              preload="metadata"
              className="h-auto w-full object-contain"
              style={{ maxHeight: '100%' }}
              src={course.promoVideoUrl}
            />
          </div>
        ) : course?.coverImageUrl ? (
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
          <h2 className="text-lg font-semibold text-text-dark">{t("О курсе")}</h2>
          <p className="mt-3 leading-relaxed text-text-medium">
            {course?.description ??
              t(
                "Описание появится в ближайшее время. Если у вас есть вопросы, напишите в поддержку.",
              )}
          </p>
        </section>

        {isPaidCourse && starsPaymentError ? (
          <p className="rounded-2xl bg-brand-orange/10 px-4 py-2 text-xs text-brand-orange">
            {starsPaymentError}
          </p>
        ) : null}
        {isPaidCourse && starsPaymentMessage ? (
          <p className="rounded-2xl bg-brand-pink/10 px-4 py-2 text-xs text-brand-pink">
            {starsPaymentMessage}
          </p>
        ) : null}

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-text-dark">{t("Программа")}</h2>
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
                      {t("{count} уроков", { count: module.lessons.length })}
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
                            <div className="relative mt-2 overflow-hidden rounded-xl bg-black/80">
                              <video
                                controls
                                className="h-auto w-full max-h-48 object-contain"
                                style={{ maxHeight: '12rem' }}
                                src={lesson.videoUrl}
                                playsInline
                                preload="metadata"
                              />
                            </div>
                          ) : null}
                          <div className="mt-2 flex items-center gap-3 text-[11px] text-text-light">
                            {lesson.durationMinutes ? (
                              <span>
                                {t("{minutes} мин", {
                                  minutes: lesson.durationMinutes,
                                })}
                              </span>
                            ) : null}
                            {lesson.isPreview ? (
                              <span className="text-brand-pink">
                                {t("Превью")}
                              </span>
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
              {t("Тесты")}
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
                        {t("Вопросов: ")}
                        {Array.isArray(test.questions)
                          ? test.questions.length
                          : t("несколько")}
                      </p>
                      {test.unlockModuleId ? (
                        <p className="text-[11px] text-brand-orange/80">
                          {t("Доступ после модуля: {module}", {
                            module:
                              test.unlockModule?.title ?? t("указанный модуль"),
                          })}
                        </p>
                      ) : null}
                      {test.unlockLessonId ? (
                        <p className="text-[11px] text-brand-orange/80">
                          {t("Доступ после урока: {lesson}", {
                            lesson:
                              test.unlockLesson?.title ?? t("указанный урок"),
                          })}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleStartTest(test.id)}
                      disabled={isStarting || isTestSubmitting}
                      className="w-full rounded-full border border-brand-pink px-3 py-2 text-xs font-semibold text-brand-pink transition-colors hover:bg-brand-pink hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isStarting ? t("Готовим тест...") : t("Пройти тест")}
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
                    {t("Тест")}
                  </p>
                  <h3 className="text-lg font-semibold text-text-dark">
                    {testSession.test.title}
                  </h3>
                  <p className="text-xs text-text-light">
                    {t("{questionCount} вопросов · максимум {maxScore} баллов", {
                      questionCount: testSession.test.questionCount,
                      maxScore: testSession.test.maxScore,
                    })}
                  </p>
                  {testSession.test.unlockModule ? (
                    <p className="text-[11px] text-brand-orange/80">
                      {t("Требуется пройти модуль: {module}", {
                        module: testSession.test.unlockModule.title,
                      })}
                    </p>
                  ) : null}
                  {testSession.test.unlockLesson ? (
                    <p className="text-[11px] text-brand-orange/80">
                      {t("Требуется пройти урок: {lesson}", {
                        lesson: testSession.test.unlockLesson.title,
                      })}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={handleCloseTest}
                  disabled={isTestSubmitting}
                  className="text-xs font-semibold text-brand-orange underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {t("Закрыть")}
                </button>
              </div>

              {testResult ? (
                <div className="rounded-2xl bg-brand-pink/10 px-4 py-3 text-sm text-brand-pink">
                  {t("Результат: {score}/{maxScore} • {percent}", {
                    score: testResult.score,
                    maxScore: testResult.maxScore,
                    percent: `${testResult.percent}%`,
                  })}
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
                              ? t("Свободный ответ")
                              : question.type === "multiple"
                                ? t("Несколько вариантов")
                                : t("Один вариант")}
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
                            {isCorrect ? t("Верно") : t("Неверно")}
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
                            placeholder={t("Запишите свой ответ")}
                            disabled={Boolean(testResult)}
                            className="w-full rounded-2xl border border-border bg-white px-3 py-2 text-sm text-text-dark outline-none focus:border-brand-pink disabled:cursor-not-allowed disabled:opacity-60"
                          />
                          {evaluation?.expectedAnswer ? (
                            <p className="text-xs text-text-light">
                              {t("Ожидаемый ответ: ")}
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
                              {t("Пояснение: {text}", {
                                text: evaluation.explanation,
                              })}
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
                    {isTestSubmitting ? t("Отправляем...") : t("Отправить ответы")}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCloseTest}
                    className="w-full rounded-full bg-brand-pink px-4 py-3 text-sm font-semibold text-white shadow-sm transition-transform active:scale-95"
                  >
                    {t("Закрыть")}
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </main>

      {isRedeemModalOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4 py-8">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-text-light">
                  {t("Код доступа")}
                </p>
                <h3 className="text-lg font-semibold text-text-dark">
                  {t("Активировать код доступа")}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseRedeemModal}
                className="text-xs font-semibold text-brand-orange underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isRedeeming}
              >
                {t("Закрыть")}
              </button>
            </div>
            <p className="mt-2 text-sm text-text-light">
              {t("Введите код, который прислал менеджер после оплаты.")}
            </p>
            <input
              type="text"
              value={redeemCode}
              onChange={(event) => setRedeemCode(event.target.value)}
              placeholder={t("Код доступа из сообщения менеджера")}
              className="mt-4 w-full rounded-2xl border border-border px-3 py-2 text-sm text-text-dark outline-none focus:border-brand-pink"
              disabled={isRedeeming}
            />
            {redeemError ? (
              <p className="mt-3 rounded-2xl bg-brand-orange/10 px-3 py-2 text-xs text-brand-orange">
                {redeemError}
              </p>
            ) : null}
            {redeemSuccess ? (
              <p className="mt-3 rounded-2xl bg-brand-pink/10 px-3 py-2 text-xs text-brand-pink">
                {redeemSuccess}
              </p>
            ) : null}
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={handleRedeemCodeSubmit}
                disabled={isRedeeming}
                className="flex-1 rounded-full bg-brand-pink px-4 py-3 text-sm font-semibold text-white shadow-sm transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isRedeeming ? t("Активируем...") : t("Активировать")}
              </button>
              <button
                type="button"
                onClick={handleCloseRedeemModal}
                disabled={isRedeeming}
                className="flex-1 rounded-full border border-border px-4 py-3 text-sm font-semibold text-text-dark transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {t("Отмена")}
              </button>
            </div>
            <p className="mt-3 text-center text-xs text-text-light">
              {t("У вас ещё нет кода? Напишите менеджеру.")}
            </p>
          </div>
        </div>
      ) : null}

      {course ? (
        <footer className="fixed bottom-[76px] left-1/2 z-40 w-full max-w-md -translate-x-1/2 px-4">
          <div className="rounded-3xl bg-brand-pink px-5 py-4 text-white shadow-lg">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide">
                  {course.isFree ? t("Бесплатно") : t("Стоимость")}
                </p>
                <p className="text-lg font-semibold">
                  {course ? priceLabel : "—"}
                </p>
              </div>
              {course.isFree ? (
                <button
                  type="button"
                  onClick={handleEnroll}
                  disabled={actionDisabled}
                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-brand-orange transition-transform active:scale-95"
                >
                  {isEnrolling ? t("Подождите...") : t("Начать")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePayWithStars}
                  disabled={isPayingWithStars}
                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-brand-orange transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPayingWithStars
                    ? t("Готовим оплату...")
                    : t("Оплатить в Telegram Stars")}
                </button>
              )}
            </div>
          </div>
        </footer>
      ) : null}
    </div>
  );
}

