export enum WordType {
  NOUN = 'sustantivo',
  VERB = 'verbo',
  ADJECTIVE = 'adjetivo',
  ADVERB = 'adverbio',
  PREPOSITION = 'preposición',
  CONJUNCTION = 'conjunción',
  OTHER = 'otro'
}

export interface Word {
  id: string;
  german: string;
  spanish: string;
  type: WordType;
  gender?: 'der' | 'die' | 'das'; // Only for nouns
  exampleGerman?: string;
  exampleSpanish?: string;
}

export interface UserProgress {
  wordId: string;
  interval: number; // Days until next review
  repetition: number; // Consecutive successful recalls
  efactor: number; // Easiness factor (SM-2)
  nextReviewDate: number; // Timestamp
  status: 'new' | 'learning' | 'review' | 'graduated';
  easyCounter: number; // Number of times rated 'Easy' (5)
}

export type StudyMode = 'de-es' | 'es-de';

export interface FlashcardState {
  currentCardIndex: number;
  isFlipped: boolean;
  sessionQueue: Word[];
  sessionComplete: boolean;
}