import { UserProgress } from '../types';

// Quality of response: 
// 0: Complete blackout.
// 3: Correct with difficulty.
// 4: Correct after a hesitation.
// 5: Perfect response.

const MASTERY_THRESHOLD = 10; // Times rated "Easy" to retire from active slot
const ACTIVE_POOL_LIMIT = 50; // Max words in learning phase at once

export const calculateNextReview = (
  prevProgress: UserProgress | undefined,
  quality: number, // 0-5
  wordId: string
): UserProgress => {
  // Default for new words
  let interval = 1; // In days (for SM-2 calculation base)
  let repetition = 0;
  let efactor = 2.5;
  let easyCounter = 0;

  if (prevProgress) {
    interval = prevProgress.interval;
    repetition = prevProgress.repetition;
    efactor = prevProgress.efactor;
    easyCounter = prevProgress.easyCounter || 0;
  }

  let addedTimeMilliseconds = 0;

  // LOGIC UPDATE: Minute-based steps for learning phase (Quality < 5)
  if (quality === 5) {
    // FÁCIL: Graduate to days / Increase interval
    if (repetition === 0) {
      interval = 1;
    } else if (repetition === 1) {
      interval = 6; // Jump a bit if we already hit it once
    } else {
      interval = Math.round(interval * efactor);
    }
    repetition += 1;

    // Update E-Factor
    efactor = efactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (efactor < 1.3) efactor = 1.3;

    // Increment Easy Counter
    easyCounter += 1;

    // Time calculation: Days to Milliseconds
    addedTimeMilliseconds = interval * 24 * 60 * 60 * 1000;

  } else {
    // NOT EASY (0, 3, 4): Stay in short-term "Learning" phase
    // We reset repetition to 0 so next time they hit "Easy" it starts at 1 day interval.
    repetition = 0; 
    interval = 1; // Reset base interval to 1 day
    
    // Specific minute-based rules requested
    if (quality === 0) {
       // Olvidé -> 1 min
       addedTimeMilliseconds = 1 * 60 * 1000;
       easyCounter = Math.max(0, easyCounter - 1);
    } else if (quality === 3) {
       // Difícil -> 5 min
       addedTimeMilliseconds = 5 * 60 * 1000;
    } else if (quality === 4) {
       // Bien -> 20 min
       addedTimeMilliseconds = 20 * 60 * 1000;
    }
  }

  const now = new Date();
  const nextReviewDate = now.getTime() + addedTimeMilliseconds;

  // Determine generic status for UI
  let status: UserProgress['status'] = 'learning';
  if (quality === 5 && repetition > 1) status = 'graduated';
  else if (quality < 5) status = 'learning';

  return {
    wordId,
    interval,
    repetition,
    efactor,
    nextReviewDate,
    status,
    easyCounter
  };
};

export const getDueWords = (allWordIds: string[], progressMap: Record<string, UserProgress>): string[] => {
  const now = Date.now();
  
  // 1. Identify words currently in the "Active Learning Pool"
  // These are words that have progress but haven't reached the mastery threshold yet.
  const activeLearningIds = Object.keys(progressMap).filter(id => {
    const prog = progressMap[id];
    return (prog.easyCounter || 0) < MASTERY_THRESHOLD;
  });

  // 2. Identify "Mastered" words
  // These words don't take up a "slot" in the pool of 50, but still need review if due.
  const masteredIds = Object.keys(progressMap).filter(id => {
    const prog = progressMap[id];
    return (prog.easyCounter || 0) >= MASTERY_THRESHOLD;
  });

  // 3. Identify Available Slots
  const currentActiveCount = activeLearningIds.length;
  const slotsAvailable = Math.max(0, ACTIVE_POOL_LIMIT - currentActiveCount);

  // 4. Fill slots with NEW words
  const newWordsToAdd: string[] = [];
  if (slotsAvailable > 0) {
    // Find words that have NO progress yet
    const potentialNewWords = allWordIds.filter(id => !progressMap[id]);
    
    // Take only enough to fill the slots
    for (let i = 0; i < slotsAvailable && i < potentialNewWords.length; i++) {
      newWordsToAdd.push(potentialNewWords[i]);
    }
  }

  // 5. Build the Session Queue
  const dueIds: string[] = [];

  // A. Add Active Learning words that are DUE
  activeLearningIds.forEach(id => {
    if (progressMap[id].nextReviewDate <= now) {
      dueIds.push(id);
    }
  });

  // B. Add Mastered words that are DUE (Maintenance)
  masteredIds.forEach(id => {
    if (progressMap[id].nextReviewDate <= now) {
      dueIds.push(id);
    }
  });

  // C. Add the New Words (filling the active pool)
  return [...dueIds, ...newWordsToAdd];
};

// Helper to get stats
export const getStats = (progressMap: Record<string, UserProgress>) => {
  const total = Object.keys(progressMap).length;
  const mastered = Object.values(progressMap).filter(p => (p.easyCounter || 0) >= MASTERY_THRESHOLD).length;
  const active = total - mastered;
  
  return {
    totalSeen: total,
    mastered,
    active,
    poolLimit: ACTIVE_POOL_LIMIT
  };
};