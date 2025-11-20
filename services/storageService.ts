import { UserProgress } from '../types';

const STORAGE_KEY = 'deutschmeister_progress_v1';

export const saveProgress = (progressMap: Record<string, UserProgress>) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progressMap));
  } catch (e) {
    console.error("Failed to save progress", e);
  }
};

export const loadProgress = (): Record<string, UserProgress> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    console.error("Failed to load progress", e);
    return {};
  }
};
