import type { LevelInfo } from "@eduplay/types";
import { LEVELS } from "@eduplay/types";

/**
 * Calculate which level a user is at based on their total XP
 */
export function getLevelFromXP(xp: number): LevelInfo {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXP) return LEVELS[i];
  }
  return LEVELS[0];
}

/**
 * Calculate XP progress percentage to next level (0-100)
 */
export function getXPProgress(xp: number): number {
  const current = getLevelFromXP(xp);
  if (current.level >= 6) return 100;

  const next = LEVELS[current.level]; // next level (0-indexed so level 1 = index 0, next = index 1)
  const range = next.minXP - current.minXP;
  const earned = xp - current.minXP;

  return Math.min(100, Math.round((earned / range) * 100));
}

/**
 * Format XP number for display
 */
export function formatXP(xp: number): string {
  if (xp >= 1000) {
    return `${(xp / 1000).toFixed(1)}k`;
  }
  return xp.toString();
}

/**
 * Get badge rarity based on condition_value thresholds
 */
export type BadgeRarity = "common" | "rare" | "epic" | "legendary";

export function getBadgeRarity(conditionValue: number): BadgeRarity {
  if (conditionValue >= 50000) return "legendary";
  if (conditionValue >= 10000) return "epic";
  if (conditionValue >= 1000) return "rare";
  return "common";
}

export const RARITY_COLORS: Record<BadgeRarity, string> = {
  common: "text-gray-500 bg-gray-100",
  rare: "text-blue-600 bg-blue-100",
  epic: "text-purple-600 bg-purple-100",
  legendary: "text-orange-600 bg-orange-100",
};

/**
 * Calculate if user should level up based on new XP
 */
export function checkLevelUp(
  oldXP: number,
  newXP: number
): { leveledUp: boolean; newLevel: number; oldLevel: number } {
  const oldLevel = getLevelFromXP(oldXP).level;
  const newLevel = getLevelFromXP(newXP).level;
  return {
    leveledUp: newLevel > oldLevel,
    newLevel,
    oldLevel,
  };
}

/**
 * XP rewards per action
 */
export const XP_REWARDS = {
  LESSON_COMPLETE: 50,
  QUIZ_PASS: 100,
  QUIZ_PERFECT: 200,
  COURSE_COMPLETE: 500,
  DAILY_STREAK: 25,
  WEEKLY_MISSION: 150,
  BADGE_EARNED: 50,
  FIRST_LOGIN: 100,
  PROFILE_COMPLETE: 75,
} as const;

/**
 * EduCoin rewards per action
 */
export const COIN_REWARDS = {
  LESSON_COMPLETE: 10,
  QUIZ_PASS: 25,
  QUIZ_PERFECT: 50,
  COURSE_COMPLETE: 100,
  DAILY_STREAK: 5,
  WEEKLY_MISSION: 50,
} as const;
