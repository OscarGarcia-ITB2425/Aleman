import { UserProgress } from '../types';

// Quality of response: 
// 0: Complete blackout.
// 3: Correct with difficulty.
// 4: Correct after a hesitation.
// 5: Perfect response.

export const calculateNextReview = (
  prevProgress: UserProgress | undefined,
  quality: number, // 0-5
  wordId: string
): UserProgress => {
  // Default for new words
  let interval = 1;
  let repetition = 0;
  let efactor = 2.5;

  if (prevProgress) {
    interval = prevProgress.interval;
    repetition = prevProgress.repetition;
    efactor = prevProgress.efactor;
  }

  if (quality >= 3) {
    if (repetition === 0) {
      interval = 1;
    } else if (repetition === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * efactor);
    }
    repetition += 1;
    
    // Update E-Factor
    efactor = efactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (efactor < 1.3) efactor = 1.3;

  } else {
    // If forgot, reset reps and interval
    repetition = 0;
    interval = 1;
  }

  const now = new Date();
  const nextReviewDate = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000).getTime();

  return {
    wordId,
    interval,
    repetition,
    efactor,
    nextReviewDate,
    status: quality >= 4 ? 'graduated' : 'learning'
  };
};

export const getDueWords = (allWordIds: string[], progressMap: Record<string, UserProgress>): string[] => {
  const now = Date.now();
  const due: string[] = [];
  const newWords: string[] = [];

  allWordIds.forEach(id => {
    const prog = progressMap[id];
    if (!prog) {
      newWords.push(id);
    } else if (prog.nextReviewDate <= now) {
      due.push(id);
    }
  });

  // Strategy: Mix Review words + New words (max 10 new words per session)
  return [...due, ...newWords.slice(0, 10)];
};
