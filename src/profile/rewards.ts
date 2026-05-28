import { GameVariant } from '../enums/GameVariant';
import { applyXpGain } from './xp';
import { evaluateAchievements, applyAchievementUnlock } from './achievements';
import type {
    AchievementCtx,
    GameSummary,
    PlayerProfile,
    RewardBundle,
} from './types';

const COINS_PER_LEVEL = 50;

// Pure: compute (xp, coins, achievement candidates) earned for a game.
// Achievements are RE-checked in applyRewards after stats are updated;
// computeGameRewards only returns the prospective xp/coin deltas.
export function computeGameRewards(summary: GameSummary, profile: PlayerProfile): RewardBundle {
    let xp = 0;
    let coins = 0;

    if (summary.variant === GameVariant.Rainbow) {
        xp += 25;
        if (summary.won) xp += 25;
    } else {
        // Puzzle (any flavour: random, adventure, daily, vs-AI)
        xp += 40;
        if (summary.won) xp += 60;
    }

    // Adventure-only bonuses.
    if (summary.levelId && summary.levelNumber && summary.won) {
        const firstClear = !profile.stats.clearedLevelIds[summary.levelId];
        if (firstClear) xp += 100;
        const stars = summary.starsEarned ?? 0;
        if (stars > 1) xp += 25 * (stars - 1);  // 2⭐ = +25, 3⭐ = +50
        if (stars === 3) coins += 15;
    }

    // Daily-only bonuses.
    if (summary.dailyDateKey) {
        xp += 50;
        if (summary.won) {
            xp += 100;
            coins += 10;
            const streak = summary.dailyStreakAfter ?? 0;
            if (streak > 0) {
                coins += Math.min(30, streak * 5);
                xp += Math.min(100, streak * 10);
            }
        }
    }

    return { xpGained: xp, coinsGained: coins, levelsGained: 0, newAchievements: [] };
}

// Apply XP/coins to the profile, then re-evaluate achievements against
// the updated stats. Achievement xp/coin rewards stack on top.
//
// `now` is passed in for deterministic test timestamps.
export function applyRewards(
    profile: PlayerProfile,
    rewards: RewardBundle,
    summary: GameSummary,
    now: Date = new Date(),
): { profile: PlayerProfile; rewards: RewardBundle } {
    // Step 1: stat updates (before XP, so achievement predicates see the
    // counter the player just earned — e.g. "5 lifetime Yahtzees").
    const stats = applyStatUpdates(profile.stats, summary);
    let next: PlayerProfile = { ...profile, stats };

    // Step 2: XP gain (+ level-up coins).
    const xpResult = applyXpGain(next, rewards.xpGained);
    next = xpResult.profile;
    const levelUpCoins = xpResult.levelsGained * COINS_PER_LEVEL;

    // Step 3: bank coins (game-derived + level-up).
    next = { ...next, coins: next.coins + rewards.coinsGained + levelUpCoins };

    // Step 4: achievements. Re-checked against the freshly-mutated stats.
    const ctx: AchievementCtx = { lastGameSummary: summary };
    const newDefs = evaluateAchievements(next, ctx);
    let extraXp = 0;
    let extraCoins = 0;
    for (const def of newDefs) {
        next = applyAchievementUnlock(next, def, now);
        extraXp += def.xpReward;
        extraCoins += def.coinReward;
    }
    if (extraXp > 0) {
        const ach = applyXpGain(next, extraXp);
        next = ach.profile;
        // Achievement-driven level-ups also pay level-up coins.
        extraCoins += ach.levelsGained * COINS_PER_LEVEL;
        rewards.levelsGained = xpResult.levelsGained + ach.levelsGained;
    } else {
        rewards.levelsGained = xpResult.levelsGained;
    }
    if (extraCoins > 0) {
        next = { ...next, coins: next.coins + extraCoins };
    }

    const finalRewards: RewardBundle = {
        xpGained: rewards.xpGained + extraXp,
        coinsGained: rewards.coinsGained + levelUpCoins + extraCoins,
        levelsGained: rewards.levelsGained,
        newAchievements: newDefs,
    };
    return { profile: next, rewards: finalRewards };
}

function applyStatUpdates(stats: PlayerProfile['stats'], s: GameSummary): PlayerProfile['stats'] {
    const next = {
        ...stats,
        clearedLevelIds: { ...stats.clearedLevelIds },
        threeStarWorlds: { ...stats.threeStarWorlds },
        worldsCleared: { ...stats.worldsCleared },
        distinctDailyDates: { ...stats.distinctDailyDates },
    };
    next.gamesPlayed += 1;
    next.highestSingleGameScore = Math.max(next.highestSingleGameScore, s.totalScore);
    next.yahtzeesScored += s.yahtzeesScored ?? 0;
    next.bonusTurnsTaken += s.bonusTurnsTaken ?? 0;
    if (s.variant === GameVariant.Rainbow && s.won) next.rainbowWins += 1;
    if (s.variant === GameVariant.Puzzle) {
        next.puzzlesPlayed += 1;
        if (s.won) next.puzzlesWon += 1;
    }
    if (s.levelId && s.won) next.clearedLevelIds[s.levelId] = true;
    if (s.starsEarned === 3) next.threeStarLevels += 1;
    if (s.dailyDateKey) {
        next.dailyPuzzlesPlayed += 1;
        next.distinctDailyDates[s.dailyDateKey] = true;
        if (s.won) next.dailyPuzzlesWon += 1;
        if ((s.dailyStreakAfter ?? 0) > next.longestDailyStreak) {
            next.longestDailyStreak = s.dailyStreakAfter ?? 0;
        }
    }
    return next;
}

// Default empty stats for a brand-new profile.
export function emptyStats(): PlayerProfile['stats'] {
    return {
        gamesPlayed: 0,
        rainbowWins: 0,
        puzzlesPlayed: 0,
        puzzlesWon: 0,
        clearedLevelIds: {},
        threeStarLevels: 0,
        threeStarWorlds: {},
        worldsCleared: {},
        dailyPuzzlesPlayed: 0,
        dailyPuzzlesWon: 0,
        distinctDailyDates: {},
        longestDailyStreak: 0,
        bonusTurnsTaken: 0,
        yahtzeesScored: 0,
        highestSingleGameScore: 0,
    };
}

export function emptyProfile(now: Date = new Date()): PlayerProfile {
    return {
        version: 1,
        createdAt: now.toISOString(),
        xp: 0,
        level: 1,
        coins: 0,
        unlocked: {},
        inventory: {},
        stats: emptyStats(),
    };
}
