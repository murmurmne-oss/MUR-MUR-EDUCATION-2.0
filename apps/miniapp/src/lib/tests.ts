export type ParsedTestQuestion = {
  id: string;
  prompt: string;
  type: 'single' | 'multiple' | 'open';
  options: Array<{
    id: string;
    text: string;
    isCorrect: boolean;
  }>;
  explanation?: string;
  correctAnswer?: string;
};

export type ParsedCourseTest = {
  id: string;
  title: string;
  description?: string | null;
  questions: ParsedTestQuestion[];
};

function createLocalId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `test-${Math.random().toString(36).slice(2, 10)}`;
}

export function parseTestQuestions(rawQuestions: unknown): ParsedTestQuestion[] {
  if (!Array.isArray(rawQuestions)) {
    return [];
  }

  const questions: ParsedTestQuestion[] = [];

  for (const raw of rawQuestions as unknown[]) {
    if (!raw || typeof raw !== 'object') {
      continue;
    }

    const questionRecord = raw as Record<string, unknown>;
    const prompt =
      typeof questionRecord.prompt === 'string'
        ? questionRecord.prompt.trim()
        : typeof questionRecord.question === 'string'
          ? questionRecord.question.trim()
          : '';

    if (prompt.length === 0) {
      continue;
    }

    const explanation =
      typeof questionRecord.explanation === 'string'
        ? questionRecord.explanation.trim()
        : undefined;

    const rawType =
      typeof questionRecord.type === 'string'
        ? questionRecord.type.toLowerCase()
        : undefined;

    let type: ParsedTestQuestion['type'];
    if (rawType === 'multiple' || rawType === 'open' || rawType === 'single') {
      type = rawType;
    } else {
      type = questionRecord.allowMultiple === true ? 'multiple' : 'single';
    }

    let options: ParsedTestQuestion['options'] = [];
    const rawOptions = questionRecord.options;

    if (Array.isArray(rawOptions)) {
      const optionRecords = rawOptions as Array<Record<string, unknown>>;
      options = optionRecords
        .map((option, index) => {
          const text =
            typeof option.text === 'string'
              ? option.text.trim()
              : typeof option.value === 'string'
                ? option.value.trim()
                : typeof option === 'string'
                  ? option.trim()
                  : typeof option === 'number' || typeof option === 'boolean'
                    ? String(option)
                    : '';
          if (text.length === 0) {
            return null;
          }
          const isCorrect = option.isCorrect === true;
          return {
            id: (option.id as string) ?? createLocalId() + `-${index}`,
            text,
            isCorrect,
          };
        })
        .filter((option): option is ParsedTestQuestion['options'][number] => option !== null);
    }

    if (options.length === 0 && type !== 'open') {
      const answersRaw = questionRecord.answer;
      const correctIndexes = new Set<number>();

      if (typeof answersRaw === 'number' && Number.isFinite(answersRaw)) {
        correctIndexes.add(answersRaw);
      } else if (Array.isArray(answersRaw)) {
        for (const value of answersRaw) {
          if (typeof value === 'number' && Number.isFinite(value)) {
            correctIndexes.add(value);
          }
        }
      }

      options = (Array.isArray(rawOptions) ? (rawOptions as unknown[]) : [])
        .map((option, index) => {
          const text =
            typeof option === 'string'
              ? option.trim()
              : typeof option === 'number' || typeof option === 'boolean'
                ? String(option)
                : '';
          if (text.length === 0) {
            return null;
          }
          return {
            id: createLocalId(),
            text,
            isCorrect: correctIndexes.has(index),
          };
        })
        .filter((option): option is ParsedTestQuestion['options'][number] => option !== null);
    }

    if (type === 'open') {
      options = [];
    }

    let correctAnswer =
      typeof questionRecord.correctAnswer === 'string'
        ? questionRecord.correctAnswer.trim()
        : undefined;

    if (type === 'open' && !correctAnswer && typeof questionRecord.answer === 'string') {
      const fallback = questionRecord.answer.trim();
      correctAnswer = fallback.length > 0 ? fallback : undefined;
    }

    const correctCount = options.filter((option) => option.isCorrect).length;
    if (correctCount > 1 && type === 'single') {
      type = 'multiple';
    }

    questions.push({
      id: createLocalId(),
      prompt,
      type,
      options,
      explanation,
      correctAnswer,
    });
  }

  return questions;
}

export function parseCourseTest(rawTest: {
  id: string;
  title: string;
  description?: string | null;
  questions: unknown;
}): ParsedCourseTest {
  return {
    id: rawTest.id,
    title: rawTest.title,
    description: rawTest.description ?? null,
    questions: parseTestQuestions(rawTest.questions),
  };
}
