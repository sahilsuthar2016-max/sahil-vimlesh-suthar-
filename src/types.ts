/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum ExerciseId {
  FLASH_LETTER = "flash-letter",
  FLASH_NUMBER = "flash-number",
  FLASH_SENTENCE = "flash-sentence",
  FLASH_PARAGRAPH = "flash-paragraph",
  PERIPHERAL_VISION = "peripheral-vision",
  CHUNK_READING = "chunk-reading",
  RSVP_SPEED_READING = "rsvp-speed-reading",
  WORD_GROUP = "word-group",
  VISUAL_PATTERN = "visual-pattern",
  DUAL_N_BACK = "dual-n-back"
}

export interface ExerciseConfig {
  id: ExerciseId;
  name: string;
  description: string;
  category: "Memory" | "Speed Reading" | "Attention" | "Vision";
  icon: string;
  difficultyScale: {
    min: number;
    max: number;
    default: number;
  };
}

export interface ExerciseSession {
  id: string; // Unique session ID
  exerciseId: ExerciseId;
  date: string; // ISO string
  durationSec: number;
  accuracy: number; // 0 - 100
  reactionTimeMs: number;
  difficulty: number;
  score: number;
  improvement?: number; // percentage change from prior sessions
  details?: Record<string, any>; // custom exercise-specific data (e.g. heatmap, missed words)
}

export interface UserStats {
  sessions: ExerciseSession[];
  xp: number;
  level: number;
  streak: number; // Current daily streak
  lastActiveDate: string | null; // YYYY-MM-DD
  bestScores: Record<ExerciseId, number>; // exerciseId -> best score
  unlockedAchievements: string[]; // achievement IDs
  dailyChallengeDate: string | null; // YYYY-MM-DD
  dailyChallengeCompleted: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: "XP" | "Streak" | "Memory" | "Speed Reading" | "Attention" | "Vision" | "General";
  maxProgress: number;
  xpReward: number;
}

export interface DailyChallenge {
  id: string;
  exerciseId: ExerciseId;
  title: string;
  description: string;
  targetValue: number;
  targetType: "score" | "accuracy" | "duration";
  xpReward: number;
}

export interface AppSettings {
  difficultyAutoScaling: boolean;
  timerSounds: boolean;
  theme: "dark" | "light";
  fullscreen: boolean;
  keyboardShortcuts: boolean;
  practiceReminder: boolean;
  reminderTime: string; // HH:MM
}
