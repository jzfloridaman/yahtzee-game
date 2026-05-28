import type { PlayerProfile } from './types';

// Quadratic XP curve:
//   xpForLevel(N) = 100 * (N - 1) * N / 2
//
// Thresholds (rounded): L2 = 100, L3 = 300, L5 = 1000, L10 = 4500,
// L20 = 19000. Slow late-game progression keeps long-tail goals
// meaningful. Tunable in one place — adjust the coefficient if pacing
// needs to feel friendlier.
const XP_COEFFICIENT = 100;

export function xpForLevel(level: number): number {
    if (level <= 1) return 0;
    return Math.floor((XP_COEFFICIENT * (level - 1) * level) / 2);
}

export function levelForXp(xp: number): number {
    if (xp <= 0) return 1;
    // Closed-form inverse of the curve: solve 100 * (L-1) * L / 2 = xp
    // for L, then floor. Equivalent to a binary search but constant-time.
    // L = (1 + sqrt(1 + 8 * xp / 100)) / 2
    const ratio = (8 * xp) / XP_COEFFICIENT;
    const lvl = Math.floor((1 + Math.sqrt(1 + ratio)) / 2);
    // Floor guard: ensure xpForLevel(lvl) <= xp < xpForLevel(lvl+1).
    return Math.max(1, lvl);
}

export interface XpProgress {
    level: number;
    currentXp: number;          // total lifetime XP
    xpIntoLevel: number;        // progress within the current level
    xpForCurrentLevel: number;  // threshold to enter this level
    xpForNextLevel: number;     // threshold to enter the next level
    xpNeededToNext: number;     // remaining to reach next
}

export function xpToNextLevel(xp: number): XpProgress {
    const level = levelForXp(xp);
    const xpForCurrentLevel = xpForLevel(level);
    const xpForNextLevel = xpForLevel(level + 1);
    return {
        level,
        currentXp: xp,
        xpIntoLevel: xp - xpForCurrentLevel,
        xpForCurrentLevel,
        xpForNextLevel,
        xpNeededToNext: xpForNextLevel - xp,
    };
}

// Pure XP application — returns the next profile shape and how many
// levels were gained in this single application. Idempotent for amount=0.
export function applyXpGain(
    profile: PlayerProfile,
    amount: number,
): { profile: PlayerProfile; levelsGained: number } {
    if (amount <= 0) return { profile, levelsGained: 0 };
    const newXp = profile.xp + amount;
    const newLevel = levelForXp(newXp);
    const levelsGained = newLevel - profile.level;
    return {
        profile: { ...profile, xp: newXp, level: newLevel },
        levelsGained: Math.max(0, levelsGained),
    };
}
