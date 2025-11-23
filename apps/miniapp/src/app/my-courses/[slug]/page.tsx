'use client';

import {
  startTransition,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { useTelegram } from '@/hooks/useTelegram';
import { useUserProfile } from '@/hooks/useUserProfile';
import {
  apiClient,
  CourseDetails,
  UpdateLessonProgressPayload,
  UserEnrollment,
  PublicForm,
  StartFormPayload,
  StartFormResponse,
  SubmitFormPayload,
  SubmitFormResult,
  StartTestPayload,
  SubmitTestPayload,
} from '@/lib/api-client';
import {
  LessonContentBlock,
  parseLessonBlocks,
} from '@/lib/lesson-content';
import { ParsedCourseTest, parseCourseTest } from '@/lib/tests';
import { createTranslator, type TranslateFn } from '@/lib/i18n';

const DEV_USER_ID =
  process.env.NEXT_PUBLIC_DEV_USER_ID ?? '555666777';

type LessonRef = {
  moduleId: string;
  moduleTitle: string;
  moduleOrder: number;
  lesson: CourseDetails['modules'][number]['lessons'][number];
};

type LessonStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

type LessonProgressState = {
  status: LessonStatus;
  progressPercent: number;
  lastViewedAt: string | null;
  completedAt: string | null;
};

const STATUS_LABELS: Record<LessonStatus, string> = {
  NOT_STARTED: 'Не начат',
  IN_PROGRESS: 'В процессе',
  COMPLETED: 'Завершён',
};

const STATUS_BADGES: Record<LessonStatus, string> = {
  NOT_STARTED: 'bg-card text-text-light',
  IN_PROGRESS: 'bg-brand-orange/10 text-brand-orange',
  COMPLETED: 'bg-brand-pink text-white',
};

const STATUS_ACCENTS: Record<LessonStatus, string> = {
  NOT_STARTED: 'text-text-light',
  IN_PROGRESS: 'text-brand-orange',
  COMPLETED: 'text-brand-pink',
};

type ParagraphBlock = Extract<LessonContentBlock, { type: 'paragraph' }>;
type ParagraphFontFamily = Exclude<ParagraphBlock['fontFamily'], undefined>;
type ParagraphFontSize = Exclude<ParagraphBlock['fontSize'], undefined>;
type ParagraphFontWeight = Exclude<ParagraphBlock['fontWeight'], undefined>;
type AlignableBlock = Extract<LessonContentBlock, { align?: unknown }>;
type BlockAlign = Exclude<AlignableBlock['align'], undefined>;

const FONT_FAMILY_CLASSES: Record<ParagraphFontFamily, string> = {
  mono: 'font-mono',
  sans: 'font-sans',
  serif: 'font-serif',
  display: 'font-display',
  handwriting: 'font-handwriting',
};

const FONT_SIZE_CLASSES: Record<ParagraphFontSize, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
};

const FONT_WEIGHT_CLASSES: Record<ParagraphFontWeight, string> = {
  bold: 'font-semibold',
  medium: 'font-medium',
  regular: 'font-normal',
};

const ALIGN_CLASSES: Record<BlockAlign, string> = {
  center: 'text-center',
  left: 'text-left',
  right: 'text-right',
};

function clampPercent(status: LessonStatus) {
  if (status === 'COMPLETED') return 100;
  if (status === 'IN_PROGRESS') return 60;
  return 0;
}

function TestRunnerModal({
  test,
  courseSlug,
  userId,
  userProfilePayload,
  onClose,
  t,
}: {
  test: ParsedCourseTest;
  courseSlug: string;
  userId: string;
  userProfilePayload: StartTestPayload;
  onClose: () => void;
  t: TranslateFn;
}) {
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6"
      onClick={(e) => {
        // Закрываем при клике на фон
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-md max-h-[90vh] rounded-3xl bg-white p-5 shadow-lg overflow-y-auto">
        <TestRunner 
          test={test} 
          courseSlug={courseSlug}
          userId={userId}
          userProfilePayload={userProfilePayload}
          onClose={onClose} 
          t={t} 
        />
      </div>
    </div>
  );
}

type QuestionResult = {
  question: ParsedCourseTest['questions'][number];
  isCorrect: boolean;
  userAnswer: string | string[];
  correctAnswer: string | string[];
};

function normalizeArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }
  if (typeof value === 'string') {
    return [value];
  }
  return [];
}

function TestRunner({
  test,
  courseSlug,
  userId,
  userProfilePayload,
  onClose,
  t,
}: {
  test: ParsedCourseTest;
  courseSlug: string;
  userId: string;
  userProfilePayload: StartTestPayload;
  onClose: () => void;
  t: TranslateFn;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [isFinished, setIsFinished] = useState(false);
  const [evaluations, setEvaluations] = useState<QuestionResult[] | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Начинаем тест при монтировании
  useEffect(() => {
    let active = true;
    setIsStarting(true);
    setCurrentIndex(0);
    setAnswers({});
    setIsFinished(false);
    setEvaluations(null);
    setError(null);
    setAttemptId(null);

    apiClient
      .startCourseTest(courseSlug, test.id, userProfilePayload)
      .then((response) => {
        if (!active) return;
        setAttemptId(response.attemptId);
        setIsStarting(false);
      })
      .catch((startError) => {
        console.error('Failed to start test', startError);
        if (!active) return;
        setError(
          startError instanceof Error
            ? startError.message
            : t('Не удалось начать тест. Попробуйте позже.'),
        );
        setIsStarting(false);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [test.id, courseSlug, userProfilePayload]); // Убрали t и test из зависимостей, используем только стабильные значения

  const currentQuestion = test.questions[currentIndex];
  const totalQuestions = test.questions.length;
  const isLastQuestion = currentIndex === totalQuestions - 1;

  const currentValue = answers[currentQuestion?.id ?? ''];

  // ВСЕ ХУКИ ДОЛЖНЫ БЫТЬ ВЫЗВАНЫ ДО ЛЮБЫХ УСЛОВНЫХ ВОЗВРАТОВ!
  const allAnswered = useMemo(() => {
    return test.questions.every((question) => {
      const answer = answers[question.id];
      if (question.type === 'open') {
        return typeof answer === 'string' && answer.trim().length > 0;
      }
      if (question.type === 'single') {
        return typeof answer === 'string' && answer.length > 0;
      }
      return Array.isArray(answer) && answer.length > 0;
    });
  }, [answers, test.questions]);

  const evaluateTest = useCallback((): QuestionResult[] => {
    return test.questions.map((question) => {
      const answer = answers[question.id];

      if (question.type === 'open') {
        const userValue = typeof answer === 'string' ? answer.trim() : '';
        const expectedValue = question.correctAnswer?.trim() ?? '';
        const isCorrect = expectedValue.length > 0
          ? userValue.toLowerCase() === expectedValue.toLowerCase()
          : userValue.length > 0;

        return {
          question,
          isCorrect,
          userAnswer: userValue,
          correctAnswer: expectedValue,
        };
      }

      const selectedIds = Array.isArray(answer)
        ? (answer as string[])
        : typeof answer === 'string'
          ? [answer]
          : [];
      const correctOptions = question.options.filter((option) => option.isCorrect);
      const correctIds = correctOptions.map((option) => option.id);

      if (question.type === 'single') {
        const selectedOption = question.options.find(
          (option) => option.id === selectedIds[0],
        );
        const correctOption = correctOptions[0];
        const isCorrect = !!selectedOption && selectedOption.isCorrect;

        return {
          question,
          isCorrect,
          userAnswer: selectedOption?.text ?? '',
          correctAnswer: correctOption?.text ?? '',
        };
      }

      const userTexts = question.options
        .filter((option) => selectedIds.includes(option.id))
        .map((option) => option.text);
      const correctTexts = correctOptions.map((option) => option.text);

      const isCorrect =
        selectedIds.length === correctIds.length &&
        selectedIds.every((id) => correctIds.includes(id));

      return {
        question,
        isCorrect,
        userAnswer: userTexts,
        correctAnswer: correctTexts,
      };
    });
  }, [answers, test.questions]);

  const handleSelectSingle = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

  const handleToggleMultiple = (questionId: string, optionId: string) => {
    setAnswers((prev) => {
      const prevValue = Array.isArray(prev[questionId])
        ? (prev[questionId] as string[])
        : [];
      const nextValue = prevValue.includes(optionId)
        ? prevValue.filter((id) => id !== optionId)
        : [...prevValue, optionId];
      return {
        ...prev,
        [questionId]: nextValue,
      };
    });
  };

  const handleOpenAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handlePrev = () => {
    setCurrentIndex((index) => Math.max(index - 1, 0));
  };

  const handleNext = () => {
    setCurrentIndex((index) =>
      Math.min(index + 1, test.questions.length - 1),
    );
  };

  const handleFinish = async () => {
    if (!attemptId) {
      setError(t('Не удалось отправить тест. Попробуйте закрыть и открыть тест снова.'));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload: SubmitTestPayload = {
        attemptId,
        answers: test.questions.map((question) => {
          const value = answers[question.id];
          if (question.type === 'open') {
            return {
              questionId: question.id,
              textAnswer: typeof value === 'string' ? value : '',
            };
          }

          const selected = Array.isArray(value) ? (value as string[]) : [];
          return {
            questionId: question.id,
            selectedOptionIds: selected,
          };
        }),
      };

      await apiClient.submitCourseTest(courseSlug, test.id, payload);
      
      // Оцениваем локально для отображения результатов
      const result = evaluateTest();
      setEvaluations(result);
      setIsFinished(true);
    } catch (submitError) {
      console.error('Failed to submit test', submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : t('Не удалось отправить тест. Попробуйте позже.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestart = () => {
    setAnswers({});
    setCurrentIndex(0);
    setIsFinished(false);
    setEvaluations(null);
  };

  if (isFinished && evaluations) {
    const correctCount = evaluations.filter((item) => item.isCorrect).length;
    const percent = Math.round((correctCount / totalQuestions) * 100);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between sticky top-0 bg-white pb-2 z-10">
          <div>
            <h3 className="text-lg font-semibold text-text-dark">
              {test.title}
            </h3>
            <p className="text-xs text-text-light">
              {t("Результат: {correct} из {total} ({percent}%)", {
                correct: correctCount,
                total: totalQuestions,
                percent,
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-card px-3 py-1 text-xs font-semibold text-text-medium transition-colors hover:border-brand-pink hover:text-text-dark flex-shrink-0"
          >
            {t("Закрыть")}
          </button>
        </div>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
          {evaluations.map((item, index) => (
            <div
              key={item.question.id}
              className={`space-y-2 rounded-2xl border px-3 py-3 ${
                item.isCorrect
                  ? 'border-brand-pink/60 bg-brand-pink/5'
                  : 'border-brand-orange/40 bg-brand-orange/5'
              }`}
            >
              <p className="text-sm font-medium text-text-dark">
                {index + 1}. {item.question.prompt}
              </p>
              {Array.isArray(item.userAnswer) ? (
                <p className="text-xs text-text-light">
                  {t("Ваш ответ: ")}
                  {item.userAnswer.length > 0
                    ? item.userAnswer.join(', ')
                    : '—'}
                </p>
              ) : (
                <p className="text-xs text-text-light">
                  {t("Ваш ответ: {answer}", {
                    answer: item.userAnswer || '—',
                  })}
                </p>
              )}
              {Array.isArray(item.correctAnswer) ? (
                <p className="text-xs text-text-light">
                  {t("Правильный ответ: ")}
                  {item.correctAnswer.length > 0
                    ? item.correctAnswer.join(', ')
                    : '—'}
                </p>
              ) : item.correctAnswer ? (
                <p className="text-xs text-text-light">
                  {t("Правильный ответ: {answer}", {
                    answer: item.correctAnswer,
                  })}
                </p>
              ) : null}
              {item.question.explanation ? (
                <p className="text-xs text-text-light">
                  {t("Пояснение: {text}", {
                    text: item.question.explanation,
                  })}
                </p>
              ) : null}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 sticky bottom-0 bg-white pt-2">
          <button
            type="button"
            onClick={handleRestart}
            className="rounded-full border border-brand-pink px-3 py-1 text-xs font-semibold text-brand-pink transition-colors hover:bg-brand-pink hover:text-white"
          >
            {t("Пройти снова")}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-brand-pink px-4 py-2 text-xs font-semibold text-white transition-transform active:scale-95"
          >
            {t("Закрыть")}
          </button>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-text-dark">
            {test.title}
          </h3>
          <p className="text-xs text-text-light">
            {t("Вопрос {index} из {total}", {
              index: currentIndex + 1,
              total: totalQuestions,
            })}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-card px-3 py-1 text-xs font-semibold text-text-medium transition-colors hover:border-brand-pink hover:text-text-dark"
          >
            {t("Закрыть")}
        </button>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-text-dark">
          {currentQuestion.prompt}
        </p>

        {currentQuestion.type === 'single' ? (
          <div className="space-y-2">
            {currentQuestion.options.map((option) => (
              <label
                key={option.id}
                className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-3 py-2 text-sm transition-colors ${
                  currentValue === option.id
                    ? 'border-brand-pink bg-brand-pink/10 text-brand-pink'
                    : 'border-border bg-surface text-text-dark hover:border-brand-pink'
                }`}
              >
                <input
                  type="radio"
                  name={`question-${currentQuestion.id}`}
                  value={option.id}
                  checked={currentValue === option.id}
                  onChange={() =>
                    handleSelectSingle(currentQuestion.id, option.id)
                  }
                  className="hidden"
                />
                <span>{option.text}</span>
              </label>
            ))}
          </div>
        ) : currentQuestion.type === 'multiple' ? (
          <div className="space-y-2">
            {currentQuestion.options.map((option) => {
              const selectedIds = normalizeArray(currentValue);
              const checked = selectedIds.includes(option.id);
              return (
                <label
                  key={option.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-3 py-2 text-sm transition-colors ${
                    checked
                      ? 'border-brand-pink bg-brand-pink/10 text-brand-pink'
                      : 'border-border bg-surface text-text-dark hover:border-brand-pink'
                  }`}
                >
                  <input
                    type="checkbox"
                    value={option.id}
                    checked={checked}
                    onChange={() =>
                      handleToggleMultiple(currentQuestion.id, option.id)
                    }
                    className="hidden"
                  />
                  <span>{option.text}</span>
                </label>
              );
            })}
          </div>
        ) : (
          <textarea
            value={typeof currentValue === 'string' ? currentValue : ''}
            onChange={(event) =>
              handleOpenAnswerChange(currentQuestion.id, event.target.value)
            }
            rows={3}
            placeholder={t("Введите ваш ответ")}
            className="w-full rounded-2xl border border-border bg-surface px-3 py-2 text-sm text-text-dark outline-none focus:border-brand-pink"
          />
        )}
      </div>

      {error && !isFinished && (
        <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentIndex === 0 || isSubmitting}
          className="rounded-full border border-card px-3 py-1 text-xs font-semibold text-text-medium transition-colors hover:border-brand-pink hover:text-text-dark disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t("Назад")}
        </button>
        <button
          type="button"
          onClick={isLastQuestion ? handleFinish : handleNext}
          disabled={
            isSubmitting ||
            !attemptId ||
            (currentQuestion.type === 'open'
              ? !(typeof currentValue === 'string' && currentValue.trim().length > 0)
              : currentQuestion.type === 'single'
                ? !(typeof currentValue === 'string' && currentValue.length > 0)
                : !Array.isArray(currentValue) || currentValue.length === 0)
          }
          className="rounded-full bg-brand-pink px-4 py-2 text-xs font-semibold text-white transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting
            ? t('Отправка...')
            : isLastQuestion
              ? t('Завершить')
              : t('Следующий')}
        </button>
      </div>

      {!isLastQuestion && !allAnswered ? (
        <p className="text-[10px] text-text-light">
          {t("Чтобы завершить тест, ответьте на все вопросы.")}
        </p>
      ) : null}
    </div>
  );
}

function FormRunnerModal({
  form,
  courseSlug,
  onClose,
  t,
  userProfilePayload,
}: {
  form: PublicForm;
  courseSlug: string;
  onClose: () => void;
  t: TranslateFn;
  userProfilePayload: StartFormPayload;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-lg">
        <FormRunner
          form={form}
          courseSlug={courseSlug}
          onClose={onClose}
          t={t}
          userProfilePayload={userProfilePayload}
        />
      </div>
    </div>
  );
}

function FormRunner({
  form,
  courseSlug,
  onClose,
  t,
  userProfilePayload,
}: {
  form: PublicForm;
  courseSlug: string;
  onClose: () => void;
  t: TranslateFn;
  userProfilePayload: StartFormPayload;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [isFinished, setIsFinished] = useState(false);
  const [formResult, setFormResult] = useState<SubmitFormResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStarting, setIsStarting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setIsStarting(true);
    setCurrentIndex(0);
    setAnswers({});
    setIsFinished(false);
    setFormResult(null);
    setError(null);
    setAttemptId(null);

    // Начинаем форму при монтировании
    apiClient
      .startCourseForm(courseSlug, form.id, userProfilePayload)
      .then((response) => {
        if (!active) return;
        setAttemptId(response.attemptId);
        setIsStarting(false);
      })
      .catch((startError) => {
        if (!active) return;
        console.error("Failed to start form", startError);
        setError(
          startError instanceof Error
            ? t(startError.message)
            : t("Не удалось начать форму. Попробуйте позже."),
        );
        setIsStarting(false);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.id, courseSlug, userProfilePayload]); // Убрали t и form из зависимостей, используем только стабильные значения

  const currentQuestion = form.questions[currentIndex];
  const totalQuestions = form.questions.length;
  const isLastQuestion = currentIndex === totalQuestions - 1;

  const currentValue = answers[currentQuestion?.id ?? ''];

  // ВСЕ ХУКИ ДОЛЖНЫ БЫТЬ ВЫЗВАНЫ ДО ЛЮБЫХ УСЛОВНЫХ ВОЗВРАТОВ!
  const allAnswered = useMemo(() => {
    return form.questions.every((question) => {
      const answer = answers[question.id];
      if (form.type === "RATING") {
        // Для рейтинговых форм ответ должен быть числом от 1 до maxRating
        const rating = typeof answer === "string" ? parseFloat(answer) : (typeof answer === "number" ? answer : 0);
        return !Number.isNaN(rating) && rating >= 1 && rating <= (form.maxRating ?? 5);
      }
      // Для форм с выбором вариантов
      const selected = Array.isArray(answer) ? answer : (answer ? [answer] : []);
      return selected.length > 0;
    });
  }, [answers, form.questions, form.type, form.maxRating]);

  if (totalQuestions === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-text-medium">
          {t("Эта форма ещё не содержит вопросов.")}
        </p>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-brand-pink px-4 py-2 text-xs font-semibold text-white transition-transform active:scale-95"
          >
            {t("Закрыть")}
          </button>
        </div>
      </div>
    );
  }

  const handleSelectOption = (questionId: string, optionId: string, isMultiple: boolean) => {
    setAnswers((prev) => {
      if (isMultiple) {
        const current = Array.isArray(prev[questionId]) ? [...(prev[questionId] as string[])] : [];
        const next = current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId];
        return { ...prev, [questionId]: next };
      }
      return { ...prev, [questionId]: [optionId] };
    });
  };

  const handleRatingChange = (questionId: string, rating: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: rating.toString(),
    }));
  };

  const handleNext = () => {
    if (isLastQuestion) {
      handleSubmit();
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleSubmit = async () => {
    if (!attemptId) {
      setError(t("Не удалось отправить форму. Попробуйте начать заново."));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload: SubmitFormPayload = {
        attemptId,
        responses: answers,
      };

      const result = await apiClient.submitCourseForm(courseSlug, form.id, payload);
      setFormResult(result);
      setIsFinished(true);
    } catch (submitError) {
      console.error("Failed to submit form", submitError);
      setError(
        submitError instanceof Error
          ? t(submitError.message)
          : t("Не удалось отправить форму. Попробуйте позже."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isStarting) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-text-medium">{t("Загрузка формы...")}</p>
      </div>
    );
  }

  if (isFinished && formResult) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-text-dark">{t("Результат")}</h3>
        {formResult.result ? (
          <div className="space-y-2 rounded-xl bg-surface p-4">
            <h4 className="font-semibold text-text-dark">{formResult.result.title}</h4>
            {formResult.result.description && (
              <p className="text-sm text-text-medium">{formResult.result.description}</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-text-medium">{t("Спасибо за прохождение формы!")}</p>
        )}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-brand-pink px-4 py-2 text-xs font-semibold text-white transition-transform active:scale-95"
          >
            {t("Закрыть")}
          </button>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-text-dark">{form.title}</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-text-light hover:text-text-dark"
        >
          ✕
        </button>
      </div>

      {form.description && (
        <p className="text-sm text-text-medium">{form.description}</p>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-text-light">
          <span>
            {t("Вопрос {current} из {total}", {
              current: currentIndex + 1,
              total: totalQuestions,
            })}
          </span>
        </div>

        <div className="space-y-3">
          <h4 className="font-medium text-text-dark">{currentQuestion.text}</h4>

          {form.type === "RATING" ? (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                {Array.from({ length: form.maxRating ?? 5 }, (_, i) => i + 1).map((rating) => {
                  const isSelected = currentValue === rating.toString();
                  return (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => handleRatingChange(currentQuestion.id, rating)}
                      className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-semibold transition-all ${
                        isSelected
                          ? "bg-brand-pink text-white scale-110"
                          : "bg-surface text-text-medium hover:bg-gray-100"
                      }`}
                    >
                      {rating}
                    </button>
                  );
                })}
              </div>
              <p className="text-center text-xs text-text-light">
                {t("Оцените от 1 до {max}", { max: form.maxRating ?? 5 })}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {currentQuestion.options.map((option) => {
                const selected = Array.isArray(currentValue)
                  ? currentValue.includes(option.id)
                  : currentValue === option.id;
                const isMultiple = false; // Можно определить по типу вопроса, если нужно

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleSelectOption(currentQuestion.id, option.id, isMultiple)}
                    className={`w-full rounded-xl border-2 p-3 text-left transition-all ${
                      selected
                        ? "border-brand-pink bg-brand-pink/10"
                        : "border-border bg-surface hover:border-brand-pink/50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                          selected
                            ? "border-brand-pink bg-brand-pink"
                            : "border-text-light"
                        }`}
                      >
                        {selected && <span className="text-xs text-white">✓</span>}
                      </div>
                      <span className="text-sm text-text-dark">{option.text}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      <div className="flex justify-end gap-2">
        {currentIndex > 0 && (
          <button
            type="button"
            onClick={() => setCurrentIndex((prev) => prev - 1)}
            className="rounded-full border border-border px-4 py-2 text-xs font-medium text-text-medium transition-colors hover:bg-surface"
          >
            {t("Назад")}
          </button>
        )}
        <button
          type="button"
          onClick={handleNext}
          disabled={!allAnswered || isSubmitting}
          className="rounded-full bg-brand-pink px-4 py-2 text-xs font-semibold text-white transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting
            ? t("Отправка...")
            : isLastQuestion
              ? t("Завершить")
              : t("Следующий")}
        </button>
      </div>

      {!isLastQuestion && !allAnswered ? (
        <p className="text-[10px] text-text-light">
          {t("Чтобы продолжить, ответьте на вопрос.")}
        </p>
      ) : null}
    </div>
  );
}

export default function MyCourseDetailsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  // ВСЕ ХУКИ ДОЛЖНЫ БЫТЬ ВЫЗВАНЫ В ОДНОМ И ТОМ ЖЕ ПОРЯДКЕ ПРИ КАЖДОМ РЕНДЕРЕ!
  // Порядок вызова хуков критичен - не меняйте его!
  const router = useRouter();
  const { user } = useTelegram();
  const resolvedParams = use(params);
  const courseSlug = useMemo(() => resolvedParams.slug, [resolvedParams.slug]);
  const userId = useMemo(
    () => user?.id?.toString() ?? DEV_USER_ID,
    [user?.id],
  );
  const { profile } = useUserProfile(userId);
  // Используем язык из профиля, если есть, иначе из localStorage, иначе 'sr'
  const preferredLanguage = useMemo(() => {
    const fromProfile = profile?.languageCode;
    if (fromProfile && typeof fromProfile === 'string') {
      return fromProfile;
    }
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('murmur_preferred_language');
        if (stored && typeof stored === 'string') {
          return stored;
        }
      } catch {
        // Ignore localStorage errors
      }
    }
    return 'sr';
  }, [profile?.languageCode]);
  
  const t = useMemo(
    () => {
      const translator = createTranslator(preferredLanguage);
      return translator.t;
    },
    [preferredLanguage],
  );
  const [course, setCourse] = useState<CourseDetails | null>(null);
  const [enrollment, setEnrollment] = useState<UserEnrollment | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<LessonRef | null>(null);
  const parsedTests = useMemo(
    () => (course ? course.tests.map((test) => parseCourseTest(test)) : []),
    [course],
  );
  const [selectedTest, setSelectedTest] = useState<ParsedCourseTest | null>(null);
  const [selectedForm, setSelectedForm] = useState<PublicForm | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProgressUpdating, setIsProgressUpdating] = useState(false);

  const testProfilePayload = useMemo<StartTestPayload>(
    () => ({
      userId,
      firstName: user?.first_name ?? null,
      lastName: user?.last_name ?? null,
      username: user?.username ?? null,
      languageCode: profile?.languageCode ?? null,
      avatarUrl: user?.photo_url ?? null,
    }),
    [userId, user, profile],
  );

  const formProfilePayload = useMemo<StartFormPayload>(
    () => ({
      userId,
      firstName: user?.first_name ?? null,
      lastName: user?.last_name ?? null,
      username: user?.username ?? null,
      languageCode: profile?.languageCode ?? null,
      avatarUrl: user?.photo_url ?? null,
    }),
    [userId, user, profile],
  );

  useEffect(() => {
    let active = true;

    startTransition(() => setIsLoading(true));
    Promise.all([
      apiClient.getCourse(courseSlug, userId),
      apiClient.getUserEnrollments(userId).catch(() => null),
    ])
      .then(([courseData, enrollmentsResponse]) => {
        if (!active) return;

        const matchingEnrollment =
          enrollmentsResponse?.enrollments.find(
            (item) => item.course.slug === courseSlug,
          ) ?? null;

        // Вычисляем доступность модулей для выбора начального урока
        const parsedTests = courseData.tests.map((test) => parseCourseTest(test));
        const accessMap = new Map<string, { isLocked: boolean; requiredTest: ParsedCourseTest | null }>();
        
        // Первый модуль всегда доступен
        const firstModule = courseData.modules[0];
        if (firstModule) {
          accessMap.set(firstModule.id, { isLocked: false, requiredTest: null });
        }

        // Проверяем остальные модули
        for (let i = 1; i < courseData.modules.length; i++) {
          const module = courseData.modules[i];
          const unlockTest = parsedTests.find(
            (test) => test.unlockModuleId === module.id
          );

          if (unlockTest) {
            const testRecord = courseData.tests.find((t) => t.id === unlockTest.id);
            // Проверяем наличие завершенных попыток (attempts возвращаются только с status COMPLETED)
            const hasCompletedAttempt = testRecord?.attempts && 
              Array.isArray(testRecord.attempts) && 
              testRecord.attempts.length > 0 &&
              testRecord.attempts.some((attempt: any) => 
                attempt.status === 'COMPLETED' || attempt.completedAt !== null
              );
            
            accessMap.set(module.id, {
              isLocked: !hasCompletedAttempt,
              requiredTest: unlockTest,
            });
          } else {
            accessMap.set(module.id, { isLocked: false, requiredTest: null });
          }
        }

        const flattenedLessons: LessonRef[] = courseData.modules.flatMap(
          (module) =>
            module.lessons.map((lesson) => ({
              moduleId: module.id,
              moduleTitle: module.title,
              moduleOrder: module.order,
              lesson,
            })),
        );

        // Выбираем начальный урок с учетом доступности модулей и прогресса
        let initialLesson: LessonRef | null = null;
        
        // Сначала пытаемся найти урок по nextLessonTitle
        const nextLessonTitle = matchingEnrollment?.progress.nextLessonTitle;
        if (nextLessonTitle) {
          const nextLesson = flattenedLessons.find(
            (item) => item.lesson.title === nextLessonTitle,
          );
          
          if (nextLesson) {
            const moduleAccess = accessMap.get(nextLesson.moduleId);
            if (!moduleAccess?.isLocked) {
              initialLesson = nextLesson;
            }
          }
        }
        
        // Если не нашли по nextLessonTitle, ищем последний просмотренный урок
        if (!initialLesson && matchingEnrollment?.lessonProgress) {
          let lastViewedLesson: LessonRef | null = null;
          let lastViewedAt: string | null = null;
          
          for (const progress of matchingEnrollment.lessonProgress) {
            const lessonRef = flattenedLessons.find(
              (item) => item.lesson.id === progress.lessonId,
            );
            
            if (lessonRef) {
              const moduleAccess = accessMap.get(lessonRef.moduleId);
              if (!moduleAccess?.isLocked) {
                const viewedAt = progress.lastViewedAt || progress.completedAt;
                if (viewedAt && (!lastViewedAt || viewedAt > lastViewedAt)) {
                  lastViewedAt = viewedAt;
                  lastViewedLesson = lessonRef;
                }
              }
            }
          }
          
          if (lastViewedLesson) {
            initialLesson = lastViewedLesson;
          }
        }
        
        // Если все еще не нашли, ищем первый доступный урок
        if (!initialLesson) {
          initialLesson = flattenedLessons.find(
            (item) => {
              const moduleAccess = accessMap.get(item.moduleId);
              return !moduleAccess?.isLocked;
            },
          ) ?? null;
        }

        startTransition(() => {
          setCourse(courseData);
          setEnrollment(matchingEnrollment);
          setSelectedLesson(initialLesson);
          setError(null);
        });
      })
      .catch((loadError: unknown) => {
        console.error('Failed to load course data', loadError);
        if (!active) return;
        startTransition(() => {
          const errorMessage = loadError instanceof Error
            ? loadError.message
            : 'Не удалось загрузить курс. Попробуйте позже.';
          setError(errorMessage);
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
  }, [courseSlug, userId]); // Убрали t из зависимостей, так как он стабилен

  const lessonProgressMap = useMemo(() => {
    const map = new Map<string, LessonProgressState>();

    if (!enrollment) {
      return map;
    }

    for (const item of enrollment.lessonProgress ?? []) {
      const status = (item.status ?? 'NOT_STARTED') as LessonStatus;
      map.set(item.lessonId, {
        status,
        progressPercent:
          typeof item.progressPercent === 'number'
            ? item.progressPercent
            : clampPercent(status),
        lastViewedAt: item.lastViewedAt ?? null,
        completedAt: item.completedAt ?? null,
      });
    }

    return map;
  }, [enrollment]);

  const selectedLessonProgress = useMemo(() => {
    if (!selectedLesson) return null;
    return lessonProgressMap.get(selectedLesson.lesson.id) ?? null;
  }, [lessonProgressMap, selectedLesson]);

  const selectedLessonBlocks = useMemo(() => {
    if (!selectedLesson) return [];
    return parseLessonBlocks(selectedLesson.lesson.content);
  }, [selectedLesson]);

  const progressLabel = useMemo(() => {
    if (!enrollment) return t('Прогресс недоступен');

    return t('Прогресс: {percent}% · {next}', {
      percent: enrollment.progress.percent,
      next: enrollment.progress.nextLessonTitle
        ? t('Следующий урок: {title}', {
            title: enrollment.progress.nextLessonTitle,
          })
        : t('Все уроки завершены'),
    });
  }, [enrollment, t]);

  const progressPercent = useMemo(() => {
    if (!enrollment) return 0;
    const raw = Number(enrollment.progress.percent);
    if (Number.isNaN(raw)) {
      return 0;
    }
    return Math.min(100, Math.max(0, Math.round(raw)));
  }, [enrollment]);

  // Проверка доступности модулей на основе пройденных тестов
  const moduleAccessibility = useMemo(() => {
    const accessMap = new Map<string, { isLocked: boolean; requiredTest: ParsedCourseTest | null }>();
    
    if (!course) return accessMap;

    // Первый модуль всегда доступен
    const firstModule = course.modules[0];
    if (firstModule) {
      accessMap.set(firstModule.id, { isLocked: false, requiredTest: null });
    }

    // Проверяем остальные модули
    for (let i = 1; i < course.modules.length; i++) {
      const module = course.modules[i];
      const previousModule = course.modules[i - 1];
      
      // Ищем тест, который разблокирует этот модуль
      const unlockTest = parsedTests.find(
        (test) => test.unlockModuleId === module.id
      );

      if (unlockTest) {
        // Проверяем, пройден ли тест
        const testRecord = course.tests.find((t) => t.id === unlockTest.id);
        // Проверяем наличие завершенных попыток (attempts возвращаются только с status COMPLETED)
        const hasCompletedAttempt = testRecord?.attempts && 
          Array.isArray(testRecord.attempts) && 
          testRecord.attempts.length > 0 &&
          testRecord.attempts.some((attempt: any) => 
            attempt.status === 'COMPLETED' || attempt.completedAt !== null
          );
        
        accessMap.set(module.id, {
          isLocked: !hasCompletedAttempt,
          requiredTest: unlockTest,
        });
      } else {
        // Если нет теста для разблокировки, модуль доступен
        accessMap.set(module.id, { isLocked: false, requiredTest: null });
      }
    }

    return accessMap;
  }, [course, parsedTests]);

  const refreshEnrollment = useCallback(
    async (options?: { completedLessonId?: string }) => {
      if (!userId || !courseSlug) return;
      
      const response = await apiClient.getUserEnrollments(userId);
      const matchingEnrollment =
        response.enrollments.find(
          (item) => item.course.slug === courseSlug,
        ) ?? null;

      startTransition(() => {
        setEnrollment(matchingEnrollment);

        if (
          options?.completedLessonId &&
          matchingEnrollment?.progress.nextLessonTitle &&
          course
        ) {
          const flattenedLessons: LessonRef[] = course.modules.flatMap(
            (module) =>
              module.lessons.map((lesson) => ({
                moduleId: module.id,
                moduleTitle: module.title,
                moduleOrder: module.order,
                lesson,
              })),
          );

          const nextLesson =
            flattenedLessons.find(
              (item) =>
                item.lesson.title ===
                matchingEnrollment.progress.nextLessonTitle,
            ) ?? null;

          if (nextLesson) {
            setSelectedLesson(nextLesson);
          }
        }
      });
    },
    [course, courseSlug, userId],
  );

  const updateLessonProgress = useCallback(
    async (payload: Omit<UpdateLessonProgressPayload, 'action'>) => {
      await apiClient.updateLessonProgress(userId, {
        action: 'lesson',
        ...payload,
      });
    },
    [userId],
  );

  const ensureLessonStarted = useCallback(
    async (lessonRef: LessonRef) => {
      const currentProgress =
        lessonProgressMap.get(lessonRef.lesson.id)?.status ??
        'NOT_STARTED';

      if (!course || currentProgress !== 'NOT_STARTED') {
        return;
      }

      try {
        setIsProgressUpdating(true);
        await updateLessonProgress({
          courseId: course.id,
          lessonId: lessonRef.lesson.id,
          status: 'IN_PROGRESS',
          progressPercent: clampPercent('IN_PROGRESS'),
        });
        await refreshEnrollment();
      } catch (lessonError) {
        console.error('Failed to mark lesson as started', lessonError);
      } finally {
        setIsProgressUpdating(false);
      }
    },
    [course, lessonProgressMap, refreshEnrollment, updateLessonProgress],
  );

  const previousModuleOrderRef = useRef<number>(-1);
  const handleSelectLesson = useCallback(
    async (lessonRef: LessonRef) => {
      // Проверяем доступность модуля перед выбором урока
      const moduleAccess = moduleAccessibility.get(lessonRef.moduleId);
      if (moduleAccess?.isLocked) {
        // Если модуль заблокирован, не переключаемся на урок
        return;
      }
      
      const previousModuleOrder = previousModuleOrderRef.current;
      const newModuleOrder = lessonRef.moduleOrder;
      
      setSelectedLesson(lessonRef);
      previousModuleOrderRef.current = newModuleOrder;
      await ensureLessonStarted(lessonRef);
      
      // Прокрутка наверх при переходе на новый модуль
      if (newModuleOrder !== previousModuleOrder && typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [ensureLessonStarted, moduleAccessibility],
  );

  const handleCompleteLesson = useCallback(async () => {
    if (!course || !selectedLesson) return;

    try {
      setIsProgressUpdating(true);
      await updateLessonProgress({
        courseId: course.id,
        lessonId: selectedLesson.lesson.id,
        status: 'COMPLETED',
        progressPercent: 100,
      });
      
      // Находим текущий модуль
      const currentModule = course.modules.find(
        (m) => m.id === selectedLesson.moduleId,
      );
      
      if (!currentModule) {
        await refreshEnrollment();
        return;
      }
      
      // Находим индекс текущего урока в модуле
      const currentLessonIndex = currentModule.lessons.findIndex(
        (l) => l.id === selectedLesson.lesson.id,
      );
      
      // Проверяем, является ли это последним уроком в модуле
      const isLastLessonInModule = currentLessonIndex >= 0 && 
        currentLessonIndex === currentModule.lessons.length - 1;
      
      if (isLastLessonInModule) {
        // Это последний урок модуля - проверяем следующий модуль
        const currentModuleIndex = course.modules.findIndex(
          (m) => m.id === currentModule.id,
        );
        
        if (currentModuleIndex >= 0 && currentModuleIndex < course.modules.length - 1) {
          const nextModule = course.modules[currentModuleIndex + 1];
          const nextModuleAccess = moduleAccessibility.get(nextModule.id);
          
          // Если следующий модуль заблокирован тестом - открываем тест
          if (nextModuleAccess?.isLocked && nextModuleAccess.requiredTest) {
            await refreshEnrollment();
            setSelectedTest(nextModuleAccess.requiredTest);
            return;
          }
        }
        
        // Если это последний урок последнего модуля или следующий модуль доступен
        await refreshEnrollment();
        return;
      }
      
      // Это не последний урок - переходим к следующему уроку в том же модуле
      if (currentLessonIndex >= 0 && currentLessonIndex < currentModule.lessons.length - 1) {
        const nextLesson = currentModule.lessons[currentLessonIndex + 1];
        const nextLessonRef: LessonRef = {
          moduleId: currentModule.id,
          moduleTitle: currentModule.title,
          moduleOrder: currentModule.order,
          lesson: nextLesson,
        };
        
        await refreshEnrollment();
        setSelectedLesson(nextLessonRef);
        return;
      }
      
      // Fallback
      await refreshEnrollment();
    } catch (lessonError) {
      console.error('Failed to complete lesson', lessonError);
    } finally {
      setIsProgressUpdating(false);
    }
  }, [course, refreshEnrollment, selectedLesson, updateLessonProgress, moduleAccessibility]);

  const handleStartForm = useCallback(async (formId: string) => {
    if (!course) return;

    try {
      const response = await apiClient.startCourseForm(
        courseSlug,
        formId,
      formProfilePayload,
    );
    setSelectedForm(response.form);
    } catch (startError) {
      console.error('Failed to start form', startError);
      // Ошибка будет обработана в FormRunner
    }
  }, [course, courseSlug, formProfilePayload]);

  const handleResetLesson = useCallback(async () => {
    if (!course || !selectedLesson) return;

    try {
      setIsProgressUpdating(true);
      await updateLessonProgress({
        courseId: course.id,
        lessonId: selectedLesson.lesson.id,
        status: 'NOT_STARTED',
        progressPercent: 0,
      });
      await refreshEnrollment();
    } catch (lessonError) {
      console.error('Failed to reset lesson progress', lessonError);
    } finally {
      setIsProgressUpdating(false);
    }
  }, [course, refreshEnrollment, selectedLesson, updateLessonProgress]);

  useEffect(() => {
    if (!selectedLesson) return;
    void ensureLessonStarted(selectedLesson);
  }, [ensureLessonStarted, selectedLesson]);

  return (
    <div className="flex flex-1 flex-col bg-background text-text-dark">
      <style jsx global>{`
        .prose {
          color: inherit;
        }
        .prose p {
          margin: 0.5rem 0;
        }
        .prose ul, .prose ol {
          margin: 0.5rem 0;
          padding-left: 1.5rem;
          display: block;
          list-style-type: disc;
        }
        .prose ol {
          list-style-type: decimal;
        }
        .prose ul {
          list-style-type: disc;
        }
        .prose li {
          margin: 0.25rem 0;
          display: list-item;
        }
        .prose strong {
          font-weight: 600;
        }
        .prose em {
          font-style: italic;
        }
        .prose u {
          text-decoration: underline;
        }
        .prose s {
          text-decoration: line-through;
        }
        .prose a {
          color: #ec4899;
          text-decoration: underline;
        }
        .prose h1, .prose h2, .prose h3 {
          font-weight: 600;
          margin: 0.75rem 0;
        }
        .prose h1 {
          font-size: 1.5rem;
        }
        .prose h2 {
          font-size: 1.25rem;
        }
        .prose h3 {
          font-size: 1.125rem;
        }
      `}</style>
      <header className="space-y-2 px-4 pt-6">
        <button
          type="button"
          onClick={() => router.push('/my-courses')}
          className="text-xs font-medium text-brand-orange underline-offset-4 hover:underline"
        >
          {t('Назад к моим курсам')}
        </button>
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-6 w-52 animate-pulse rounded-full bg-card" />
            <div className="h-4 w-40 animate-pulse rounded-full bg-card" />
          </div>
        ) : error ? (
          <p className="rounded-2xl bg-card px-4 py-3 text-sm text-brand-orange">
            {error}
          </p>
        ) : (
          <>
            <h1 className="text-2xl font-semibold">
              {course?.title ?? t('Курс')}
            </h1>
            <p className="text-sm text-text-light">{progressLabel}</p>
          </>
        )}
      </header>

      <main className="mt-6 flex flex-1 flex-col gap-6 px-4 pb-28">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-28 animate-pulse rounded-3xl bg-card"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-3xl bg-card p-5 text-sm text-brand-orange">
            {error}
          </div>
        ) : !course ? (
          <div className="rounded-3xl bg-card p-5 text-sm text-brand-orange">
            {t('Курс не найден.')}
          </div>
        ) : !enrollment ? (
          <div className="space-y-4">
            <div className="rounded-3xl bg-card p-5 text-sm text-brand-orange">
              {t(
                'У вас нет доступа к этому курсу. Возможно, подписка ещё не активирована.',
              )}
            </div>
            <button
              type="button"
              onClick={() => router.push(`/courses/${course.slug}`)}
              className="w-full rounded-full bg-brand-orange px-4 py-3 text-sm font-semibold text-white shadow-sm transition-transform active:scale-95"
            >
              {t('Перейти к описанию курса')}
            </button>
          </div>
        ) : (
          <>
            <section className="rounded-3xl bg-card p-5 text-sm text-text-medium shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-brand-pink">
                    {t('Ваш прогресс')}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-text-dark">
                    {t('{percent}% завершено', { percent: progressPercent })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex h-14 w-14 items-center justify-center">
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{
                        background: `conic-gradient(#fb3b00 ${progressPercent}%, rgba(251, 59, 0, 0.15) ${progressPercent}%)`,
                      }}
                    />
                    <div className="absolute inset-1 rounded-full bg-card shadow-inner" />
                    <span className="relative text-xs font-semibold text-text-dark">
                      {progressPercent}%
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-4 h-2 w-full rounded-full bg-background">
                <div
                  className="h-2 rounded-full bg-brand-orange transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              {enrollment.progress.nextLessonTitle ? (
                <p className="mt-3 text-xs text-text-light">
                  {t('Следующий урок: {title}', {
                    title: enrollment.progress.nextLessonTitle,
                  })}
                </p>
              ) : (
                <p className="mt-3 text-xs text-text-light">
                  {t(
                    'Вы завершили все уроки курса! Возвращайтесь, чтобы освежить знания.',
                  )}
                </p>
              )}
            </section>

            <section className="space-y-4 rounded-3xl bg-white p-5 shadow-sm">
              {selectedLesson ? (
                <>
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-wide text-brand-pink">
                      {selectedLesson.moduleTitle}
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-semibold text-text-dark">
                        {selectedLesson.lesson.title}
                      </h2>
                      {selectedLessonProgress ? (
                        <span
                          className={`rounded-full px-3 py-1 text-[11px] font-semibold ${STATUS_BADGES[selectedLessonProgress.status]}`}
                        >
                          {t(STATUS_LABELS[selectedLessonProgress.status])}
                        </span>
                      ) : null}
                    </div>
                    {selectedLesson.lesson.summary ? (
                      <p className="text-sm text-text-light">
                        {selectedLesson.lesson.summary}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-4 text-sm leading-relaxed text-text-medium">
                    {selectedLessonBlocks.length === 0 ? (
                      selectedLesson.lesson.contentType === 'VIDEO' ? (
                        <p className="rounded-2xl bg-card px-4 py-3 text-sm text-text-medium">
                            {t(
                              'Откройте ссылку на видео, чтобы изучить урок.',
                            )}
                        </p>
                      ) : (
                        <p className="rounded-2xl bg-card px-4 py-3 text-sm text-text-medium">
                            {t('Контент урока появится совсем скоро.')}
                        </p>
                      )
                    ) : (
                      selectedLessonBlocks.map((block, index) => {
                        if (block.type === 'image') {
                          return (
                            <figure
                              key={`${block.url}-${index}`}
                              className={`overflow-hidden rounded-3xl bg-surface ${
                                block.align === 'left'
                                  ? 'ml-0 mr-auto'
                                  : block.align === 'right'
                                    ? 'ml-auto mr-0'
                                    : ''
                              } ${
                                block.width === 'full'
                                  ? '-mx-5 md:mx-0'
                                  : ''
                              }`}
                            >
                              <img
                                src={block.url}
                                alt={block.caption ?? t('Изображение урока')}
                                className={`h-auto w-full object-cover ${
                                  block.width === 'full'
                                    ? 'max-h-[360px]'
                                    : 'max-h-[280px]'
                                }`}
                              />
                              {block.caption ? (
                                <figcaption className="px-4 py-3 text-xs text-text-light">
                                  {block.caption}
                                </figcaption>
                              ) : null}
                            </figure>
                          );
                        }

                        if (block.type === 'video') {
                          const autoplayProps = block.autoplay
                            ? { autoPlay: true, muted: true, loop: true }
                            : {};
                          return (
                            <figure
                              key={`video-${index}`}
                              className="overflow-hidden rounded-3xl bg-black/80"
                            >
                              <video
                                controls
                                poster={block.coverImageUrl ?? undefined}
                                className="h-auto w-full"
                                src={block.url}
                                {...autoplayProps}
                              />
                              {block.caption ? (
                                <figcaption className="px-4 py-2 text-xs text-text-light">
                                  {block.caption}
                                </figcaption>
                              ) : null}
                            </figure>
                          );
                        }

                        if (block.type === 'audio') {
                          return (
                            <div
                              key={`audio-${index}`}
                              className="rounded-3xl border border-border/40 bg-white px-4 py-3"
                            >
                              <audio controls className="w-full" src={block.url}>
                                {t('Ваш браузер не поддерживает элемент audio.')}
                              </audio>
                              {block.caption ? (
                                <p className="mt-2 text-xs text-text-light">
                                  {block.caption}
                                </p>
                              ) : null}
                            </div>
                          );
                        }

                        if (block.type === 'section') {
                          return (
                            <section
                              key={`section-${index}`}
                              className="space-y-3 rounded-3xl border border-border/50 bg-surface px-4 py-4"
                            >
                              {block.title ? (
                                <h4 className="text-base font-semibold text-text-dark">
                                  {block.title}
                                </h4>
                              ) : null}
                              {block.description ? (
                                <p className="text-sm text-text-light">
                                  {block.description}
                                </p>
                              ) : null}
                              {block.items.length > 0 ? (
                                <ul className="space-y-2 text-sm text-text-medium">
                                  {block.items.map((item) => (
                                    <li
                                      key={item.id}
                                      className="flex items-start gap-2"
                                    >
                                      <span className="mt-1 size-1.5 rounded-full bg-brand-orange" />
                                      <span>{item.text}</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : null}
                            </section>
                          );
                        }

                        if (block.type === 'heading') {
                          const levelClass =
                            block.level === 1
                              ? 'text-2xl'
                              : block.level === 3
                                ? 'text-lg'
                                : 'text-xl';
                          return (
                            <h3
                              key={`heading-${index}`}
                              className={`${levelClass} font-semibold text-text-dark ${ALIGN_CLASSES[block.align ?? 'left']}`}
                            >
                              {block.text}
                            </h3>
                          );
                        }

                        // Проверяем, является ли текст HTML (содержит HTML теги)
                        const isHTML = typeof block.text === 'string' && /<[a-z][\s\S]*>/i.test(block.text.trim());
                        
                        if (isHTML) {
                          // Применяем те же стили, что и для plain text
                          const fontFamily =
                            FONT_FAMILY_CLASSES[block.fontFamily ?? 'sans'];
                          const fontSize =
                            FONT_SIZE_CLASSES[block.fontSize ?? 'md'];
                          const fontWeight =
                            FONT_WEIGHT_CLASSES[block.fontWeight ?? 'regular'];
                          const align =
                            ALIGN_CLASSES[block.align ?? 'left'];
                          
                          // Рендерим HTML с теми же стилями, что и plain text
                          return (
                            <div
                              key={`paragraph-${index}`}
                              className={`prose prose-sm max-w-none ${fontFamily} ${fontSize} ${fontWeight} ${align}`}
                              dangerouslySetInnerHTML={{ __html: block.text }}
                            />
                          );
                        }

                        // Обратная совместимость: plain text с применением стилей
                        const fontFamily =
                          FONT_FAMILY_CLASSES[block.fontFamily ?? 'sans'];
                        const fontSize =
                          FONT_SIZE_CLASSES[block.fontSize ?? 'md'];
                        const fontWeight =
                          FONT_WEIGHT_CLASSES[block.fontWeight ?? 'regular'];
                        const align =
                          ALIGN_CLASSES[block.align ?? 'left'];

                        return (
                          <p
                            key={`paragraph-${index}`}
                            className={`${fontFamily} ${fontSize} ${fontWeight} ${align} whitespace-pre-wrap`}
                          >
                            {block.text}
                          </p>
                        );
                      })
                    )}
                  </div>

                  {selectedLesson.lesson.videoUrl ? (
                    <div className="rounded-2xl bg-brand-pink/10 p-4 text-sm text-brand-pink">
                      {t('Видео урок: ')}
                      <a
                        href={selectedLesson.lesson.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-4"
                      >
                        {selectedLesson.lesson.videoUrl}
                      </a>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-3 text-xs text-text-light">
                    <span>
                      {t('Тип: {value}', {
                        value: selectedLesson.lesson.contentType,
                      })}
                    </span>
                    {selectedLesson.lesson.durationMinutes ? (
                      <span>
                        {t('Длительность: ')}
                        {t('{minutes} мин', {
                          minutes: selectedLesson.lesson.durationMinutes,
                        })}
                      </span>
                    ) : null}
                    {selectedLesson.lesson.isPreview ? (
                      <span className="text-brand-pink">
                        {t('Доступен в превью')}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    {selectedLessonProgress?.status !== 'COMPLETED' ? (() => {
                      // Определяем, является ли это последним уроком в модуле
                      const currentModule = course.modules.find(
                        (m) => m.id === selectedLesson.moduleId,
                      );
                      const isLastLessonInModule = currentModule
                        ? currentModule.lessons.findIndex(
                            (l) => l.id === selectedLesson.lesson.id,
                          ) === currentModule.lessons.length - 1
                        : false;
                      
                      // Определяем следующий модуль и его доступность
                      let buttonText = t('Перейти к следующему уроку');
                      if (isLastLessonInModule && currentModule) {
                        const currentModuleIndex = course.modules.findIndex(
                          (m) => m.id === currentModule.id,
                        );
                        if (currentModuleIndex >= 0 && currentModuleIndex < course.modules.length - 1) {
                          const nextModule = course.modules[currentModuleIndex + 1];
                          const nextModuleAccess = moduleAccessibility.get(nextModule.id);
                          
                          if (nextModuleAccess?.isLocked && nextModuleAccess.requiredTest) {
                            buttonText = t('Пройти тест');
                          } else {
                            buttonText = t('Перейти на следующий модуль');
                          }
                        }
                      }
                      
                      return (
                        <button
                          type="button"
                          onClick={handleCompleteLesson}
                          disabled={isProgressUpdating}
                          className="rounded-full bg-brand-orange px-5 py-2 text-sm font-semibold text-white transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isProgressUpdating ? t('Сохраняем...') : buttonText}
                        </button>
                      );
                    })() : (
                      <span className="text-sm font-medium text-brand-pink">
                        {t('Урок завершён ')}
                        {selectedLessonProgress.completedAt
                          ? new Date(
                              selectedLessonProgress.completedAt,
                            ).toLocaleDateString('ru-RU')
                          : ''}
                      </span>
                    )}
                    {(selectedLessonProgress?.status === 'COMPLETED' ||
                      selectedLessonProgress?.status === 'IN_PROGRESS') && (
                      <button
                        type="button"
                        onClick={handleResetLesson}
                        disabled={isProgressUpdating}
                        className="rounded-full border border-card px-5 py-2 text-sm font-semibold text-text-medium transition-transform hover:border-brand-pink hover:text-text-dark active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {t('Сбросить прогресс')}
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-sm text-text-medium">
                  {t('В этом курсе пока нет уроков. Загляните позже!')}
                </div>
              )}
            </section>

            {parsedTests.length > 0 ? (
              <section className="space-y-3 rounded-3xl bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-text-dark">
                  {t('Тесты')}
                </h2>
                <ul className="space-y-3">
                  {parsedTests.map((test) => (
                    <li
                      key={test.id}
                      className="rounded-2xl border border-card bg-surface px-4 py-3 text-sm text-text-medium"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="font-medium text-text-dark">{test.title}</p>
                          {test.description ? (
                            <p className="text-xs text-text-light">{test.description}</p>
                          ) : null}
                          <p className="text-xs text-text-light">
                            {t('Вопросов: {count}', {
                              count: test.questions.length,
                            })}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedTest(test)}
                          disabled={test.questions.length === 0}
                          className="rounded-full bg-brand-pink px-4 py-2 text-xs font-semibold text-white transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {t('Пройти тест')}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {course.forms && course.forms.length > 0 ? (
              <section className="space-y-3 rounded-3xl bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-text-dark">
                  {t('Формы')}
                </h2>
                <ul className="space-y-3">
                  {course.forms.map((form) => {
                    // Преобразуем форму в PublicForm для отображения
                    const questions = Array.isArray(form.questions) ? form.questions : [];
                    const publicForm: PublicForm = {
                      id: form.id,
                      title: form.title,
                      description: form.description,
                      type: form.type === "RATING" ? "RATING" : "CHOICE",
                      maxRating: form.maxRating ?? null,
                      questionCount: questions.length,
                      questions: questions.map((q: any, index: number) => ({
                        id: q.id || `q-${index}`,
                        text: q.text || "",
                        options: Array.isArray(q.options) ? q.options.map((opt: any, optIndex: number) => ({
                          id: opt.id || `opt-${optIndex}`,
                          text: opt.text || "",
                          category: opt.category || "",
                        })) : [],
                      })),
                    };

                    return (
                      <li
                        key={form.id}
                        className="rounded-2xl border border-card bg-surface px-4 py-3 text-sm text-text-medium"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="font-medium text-text-dark">{form.title}</p>
                            {form.description ? (
                              <p className="text-xs text-text-light">{form.description}</p>
                            ) : null}
                            <p className="text-xs text-text-light">
                              {t('Вопросов: {count}', {
                                count: publicForm.questionCount,
                              })}
                              {form.type === "RATING" && form.maxRating && (
                                <> · {t("Оценка от 1 до {max}", { max: form.maxRating })}</>
                              )}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleStartForm(form.id)}
                            disabled={publicForm.questionCount === 0}
                            className="rounded-full bg-brand-pink px-4 py-2 text-xs font-semibold text-white transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {t('Пройти форму')}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-text-dark">
                {t('Программа курса')}
              </h2>
              <div className="space-y-3">
                {course.modules.map((module) => {
                  const access = moduleAccessibility.get(module.id);
                  const isLocked = access?.isLocked ?? false;
                  const requiredTest = access?.requiredTest ?? null;

                  return (
                    <div
                      key={module.id}
                      className={`space-y-2 rounded-2xl border px-4 py-3 text-sm text-text-medium ${
                        isLocked
                          ? 'border-card/50 bg-card/30 opacity-60'
                          : 'border-card bg-white'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-text-dark">
                            {module.title}
                          </p>
                          {isLocked ? (
                            <span className="rounded-full bg-brand-orange/10 px-2 py-1 text-[10px] font-semibold text-brand-orange">
                              {t('Заблокировано')}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-xs text-text-light">
                          {t('{count} уроков', { count: module.lessons.length })}
                        </p>
                        {module.description ? (
                          <p className="mt-1 text-xs text-text-light">
                            {module.description}
                          </p>
                        ) : null}
                        {isLocked && requiredTest ? (
                          <div className="mt-2 rounded-xl bg-brand-orange/10 px-3 py-2 text-xs text-brand-orange">
                            <p className="font-medium">
                              {t('Для доступа к этому модулю необходимо пройти тест:')}
                            </p>
                            <p className="mt-1">{requiredTest.title}</p>
                            <button
                              type="button"
                              onClick={() => setSelectedTest(requiredTest)}
                              className="mt-2 rounded-full bg-brand-orange px-3 py-1 text-xs font-semibold text-white transition-transform active:scale-95"
                            >
                              {t('Пройти тест')}
                            </button>
                          </div>
                        ) : null}
                      </div>
                      <div className="space-y-2">
                        {module.lessons.map((lesson) => {
                          const lessonRef: LessonRef = {
                            moduleId: module.id,
                            moduleTitle: module.title,
                            moduleOrder: module.order,
                            lesson,
                          };
                          const lessonState =
                            lessonProgressMap.get(lesson.id) ?? null;
                          const isSelected =
                            selectedLesson?.lesson.id === lesson.id;
                          const status =
                            lessonState?.status ?? 'NOT_STARTED';

                          const previewBlock =
                            parseLessonBlocks(lesson.content).find(
                              (block) =>
                                block.type === 'paragraph' ||
                                block.type === 'heading',
                            ) ?? null;

                          return (
                            <button
                              key={lesson.id}
                              type="button"
                              onClick={() => {
                                if (!isLocked) {
                                  handleSelectLesson(lessonRef);
                                }
                              }}
                              disabled={isLocked}
                              className={`w-full rounded-xl border px-3 py-2 text-left text-xs transition-colors ${
                                isLocked
                                  ? 'cursor-not-allowed border-card/30 bg-card/20 opacity-50'
                                  : isSelected
                                    ? 'border-brand-orange bg-brand-orange/10 text-text-dark'
                                    : 'border-card bg-surface hover:border-brand-orange/60 hover:text-text-dark'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-medium text-text-dark">
                                  {lesson.title}
                                </p>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_BADGES[status]}`}
                                >
                                  {t(STATUS_LABELS[status])}
                                </span>
                              </div>
                              {lesson.summary ? (
                                <p className="mt-1 text-text-light">
                                  {lesson.summary}
                                </p>
                              ) : null}
                              {previewBlock && !lesson.summary ? (() => {
                                const isHTML = typeof previewBlock.text === 'string' && /<[a-z][\s\S]*>/i.test(previewBlock.text.trim());
                                
                                if (isHTML) {
                                  // Рендерим HTML-контент с ограничением высоты
                                  return (
                                    <div
                                      className={`mt-2 overflow-hidden text-text-medium ${STATUS_ACCENTS[status]} prose prose-sm max-w-none`}
                                      style={{ 
                                        maxHeight: '3em',
                                        lineHeight: '1.5em',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                      }}
                                      dangerouslySetInnerHTML={{ __html: previewBlock.text }}
                                    />
                                  );
                                }
                                
                                // Рендерим plain text
                                return (
                                  <p
                                    className={`mt-2 overflow-hidden text-text-medium ${STATUS_ACCENTS[status]}`}
                                    style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
                                  >
                                    {previewBlock.text}
                                  </p>
                                );
                              })() : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </main>

      {selectedTest ? (
        <TestRunnerModal
          test={selectedTest}
          courseSlug={courseSlug}
          userId={userId}
          userProfilePayload={testProfilePayload}
          onClose={async () => {
            setSelectedTest(null);
            // Обновляем курс и enrollment после закрытия теста, чтобы проверить разблокировку модулей
            if (course) {
              try {
                // Небольшая задержка, чтобы дать серверу время обработать попытку
                await new Promise(resolve => setTimeout(resolve, 500));
                
                const [updatedCourse, enrollmentsResponse] = await Promise.all([
                  apiClient.getCourse(courseSlug, userId),
                  apiClient.getUserEnrollments(userId).catch(() => null),
                ]);
                
                setCourse(updatedCourse);
                
                if (enrollmentsResponse) {
                  const matchingEnrollment =
                    enrollmentsResponse.enrollments.find(
                      (item) => item.course.slug === courseSlug,
                    ) ?? null;
                  setEnrollment(matchingEnrollment);
                  
                  // Пересчитываем доступность модулей
                  const parsedTests = updatedCourse.tests.map((test) => parseCourseTest(test));
                  const accessMap = new Map<string, { isLocked: boolean; requiredTest: ParsedCourseTest | null }>();
                  
                  const firstModule = updatedCourse.modules[0];
                  if (firstModule) {
                    accessMap.set(firstModule.id, { isLocked: false, requiredTest: null });
                  }

                  for (let i = 1; i < updatedCourse.modules.length; i++) {
                    const module = updatedCourse.modules[i];
                    const unlockTest = parsedTests.find(
                      (test) => test.unlockModuleId === module.id
                    );

                    if (unlockTest) {
                      const testRecord = updatedCourse.tests.find((t) => t.id === unlockTest.id);
                      const hasCompletedAttempt = testRecord?.attempts && 
                        Array.isArray(testRecord.attempts) && 
                        testRecord.attempts.length > 0 &&
                        testRecord.attempts.some((attempt: any) => 
                          attempt.status === 'COMPLETED' || attempt.completedAt !== null
                        );
                      
                      accessMap.set(module.id, {
                        isLocked: !hasCompletedAttempt,
                        requiredTest: unlockTest,
                      });
                    } else {
                      accessMap.set(module.id, { isLocked: false, requiredTest: null });
                    }
                  }
                  
                  // Находим модуль, который был разблокирован этим тестом
                  const unlockedModule = updatedCourse.modules.find((module) => {
                    const moduleAccess = accessMap.get(module.id);
                    const wasUnlockedByTest = parsedTests.some(
                      (test) => test.unlockModuleId === module.id
                    );
                    return wasUnlockedByTest && !moduleAccess?.isLocked && module.lessons.length > 0;
                  });
                  
                  // Если нашли разблокированный модуль - переходим к его первому уроку
                  if (unlockedModule) {
                    const firstLessonOfUnlockedModule = unlockedModule.lessons[0];
                    const nextLessonRef: LessonRef = {
                      moduleId: unlockedModule.id,
                      moduleTitle: unlockedModule.title,
                      moduleOrder: unlockedModule.order,
                      lesson: firstLessonOfUnlockedModule,
                    };
                    
                    setSelectedLesson(nextLessonRef);
                    await ensureLessonStarted(nextLessonRef);
                    
                    // Прокрутка наверх
                    if (typeof window !== 'undefined') {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }
                }
              } catch (refreshError) {
                console.error('Failed to refresh course after test', refreshError);
              }
            }
          }}
          t={t}
        />
      ) : null}

      {selectedForm ? (
        <FormRunnerModal
          form={selectedForm}
          courseSlug={courseSlug}
          onClose={async () => {
            setSelectedForm(null);
            // Обновляем курс после закрытия формы, чтобы проверить разблокировку модулей
            if (course) {
              try {
                const updatedCourse = await apiClient.getCourse(courseSlug, userId);
                setCourse(updatedCourse);
              } catch (refreshError) {
                console.error('Failed to refresh course after form', refreshError);
              }
            }
          }}
          t={t}
          userProfilePayload={formProfilePayload}
        />
      ) : null}
    </div>
  );
}


