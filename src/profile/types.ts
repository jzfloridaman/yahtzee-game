import type { GameMode } from '../enums/GameMode';
import type { GameVariant } from '../enums/GameVariant';
import type { ModifierKind } from '../puzzle/types';

// Lifetime counters tracked across all games. Used by achievement
// predicates and surfaced in the Profile panel.
export interface LifetimeStats {
    gamesPlayed: number;
    rainbowWins: number;
    puzzlesPlayed: number;
    puzzlesWon: number;
    // Unique level IDs cleared at least once. Stored as a record-of-true so
    // it round-trips through JSON cleanly (sets don't).
    clearedLevelIds: Record<string, true>;
    threeStarLevels: number;
    // Per-world 3-star aggregates. Set when ALL levels in the world have
    // earned 3 stars. Stored as record so future worlds slot in cleanly.
    threeStarWorlds: Record<string, true>;
    worldsCleared: Record<string, true>;
    dailyPuzzlesPlayed: number;
    dailyPuzzlesWon: number;
    distinctDailyDates: Record<string, true>;
    longestDailyStreak: number;
    bonusTurnsTaken: number;
    yahtzeesScored: number;
    highestSingleGameScore: number;
}

export interface PlayerProfile {
    version: 1;
    createdAt: string;                 // ISO of first launch
    xp: number;
    level: number;                     // cached, derived from xp
    coins: number;
    unlocked: Record<string, string>;  // achievementId -> ISO unlocked at
    inventory: Record<string, number>; // consumableId -> count (Phase 4)
    stats: LifetimeStats;
}

// Summary of a just-finished game. Built by gameStore.endGame and passed
// to playerProfileStore.recordGameComplete.
export interface GameSummary {
    mode: GameMode;
    variant: GameVariant;
    totalScore: number;
    won: boolean;
    // Puzzle-specific.
    presentKinds?: ModifierKind[];
    engagedKinds?: ModifierKind[];
    // Adventure-specific. levelId + levelNumber + stars all defined together.
    levelId?: string;
    levelNumber?: number;
    starsEarned?: number;
    // Daily-specific.
    dailyDateKey?: string;
    dailyStreakAfter?: number;
    // Counters incremented during the game (reset per game).
    yahtzeesScored?: number;
    bonusTurnsTaken?: number;
}

export interface AchievementCtx {
    // Optional event hook key — used when the predicate fires from a
    // non-game-complete trigger (e.g. opening the Daily Puzzle screen).
    triggerEvent?: string;
    lastGameSummary?: GameSummary;
}

export interface AchievementDef {
    id: string;
    name: string;
    description: string;
    hint?: string;
    icon: string;           // FontAwesome class
    coinReward: number;
    xpReward: number;
    hidden?: boolean;
    predicate(stats: LifetimeStats, ctx?: AchievementCtx): boolean;
}

export interface RewardBundle {
    xpGained: number;
    coinsGained: number;
    levelsGained: number;
    newAchievements: AchievementDef[];
}
