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

// Generates a safe Base64 string of the current progress
export const getBackupCode = (): string => {
  const data = loadProgress();
  const json = JSON.stringify(data);
  // Handle UTF-8 characters properly for Base64
  return btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/g,
      function toSolidBytes(match, p1) {
          return String.fromCharCode(parseInt(p1, 16));
      }));
};

// Restores progress from the code string
export const restoreFromBackup = (code: string): boolean => {
  try {
    // Decode UTF-8 from Base64
    const json = decodeURIComponent(atob(code).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    
    const data = JSON.parse(json);
    
    // Basic validation to ensure we don't break the app with bad data
    if (typeof data === 'object' && data !== null) {
      saveProgress(data);
      return true;
    }
    return false;
  } catch (e) {
    console.error("Invalid backup code", e);
    return false;
  }
};