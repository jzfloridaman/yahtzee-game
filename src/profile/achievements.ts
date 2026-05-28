import { LEVELS, WORLDS } from '../puzzle/levels/definitions';
import type {
    AchievementCtx,
    AchievementDef,
    LifetimeStats,
    PlayerProfile,
} from './types';

// The full set of 7 modifier kinds — used by the "engage all kinds in one
// game" achievement. Kept here (rather than imported as a constant) so
// adding a new kind requires a deliberate update.
const ALL_MODIFIER_KINDS = [
    'iceBlock',
    'flyingMultiplier',
    'doubleCategory',
    'hotPotato',
    'multiplierBubble',
    'loopingMultiplier',
    'loopingCategory',
] as const;

function levelIdsInWorld(worldId: string): string[] {
    return LEVELS.filter(l => l.worldId === worldId).map(l => l.id);
}

export const ACHIEVEMENTS: AchievementDef[] = [
    {
        id: 'firstRoll',
        name: 'First Roll',
        description: 'You rolled the dice for the first time.',
        hint: 'Just start playing.',
        icon: 'fa-dice',
        coinReward: 5,
        xpReward: 25,
        predicate: (stats, ctx) =>
            stats.gamesPlayed >= 1 || ctx?.triggerEvent === 'firstRoll',
    },
    {
        id: 'firstWin',
        name: 'First Win',
        description: 'You won your first game — Rainbow or Puzzle.',
        hint: 'Win any game.',
        icon: 'fa-trophy',
        coinReward: 10,
        xpReward: 50,
        predicate: (stats) => stats.rainbowWins >= 1 || stats.puzzlesWon >= 1,
    },
    {
        id: 'firstPuzzle',
        name: 'Puzzle Solver',
        description: 'Completed your first puzzle game.',
        hint: 'Try Puzzle mode.',
        icon: 'fa-shapes',
        coinReward: 10,
        xpReward: 50,
        predicate: (stats) => stats.puzzlesPlayed >= 1,
    },
    {
        id: 'firstAdventure',
        name: 'Adventurer',
        description: 'Cleared the first Adventure level.',
        hint: 'Start the Adventure.',
        icon: 'fa-map',
        coinReward: 15,
        xpReward: 75,
        predicate: (stats, _ctx) => {
            const first = LEVELS[0]?.id;
            return !!(first && stats.clearedLevelIds[first]);
        },
    },
    {
        id: 'worldClear',
        name: 'World Walker',
        description: 'Cleared every level in any one world.',
        hint: 'Clear every level in a world.',
        icon: 'fa-flag-checkered',
        coinReward: 25,
        xpReward: 150,
        predicate: (stats) =>
            WORLDS.some(w => {
                const ids = levelIdsInWorld(w.id);
                return ids.length > 0 && ids.every(id => stats.clearedLevelIds[id]);
            }),
    },
    {
        id: 'threeStarLevel',
        name: 'Star Polisher',
        description: '3-starred an Adventure level.',
        hint: 'Crush a target by 50%.',
        icon: 'fa-star',
        coinReward: 20,
        xpReward: 100,
        predicate: (stats) => stats.threeStarLevels >= 1,
    },
    {
        id: 'threeStarWorld',
        name: 'Galactic',
        description: '3-starred every level in a world.',
        icon: 'fa-rocket',
        coinReward: 75,
        xpReward: 400,
        hidden: true,
        predicate: (stats, ctx) => {
            // Approximation: the per-world threeStarWorlds set is the source
            // of truth — bumped when recordAdventureWin notices the world is
            // fully 3-starred. Until then return false. (Bookkeeping for the
            // set is done in playerProfileStore.recordGameComplete.)
            return Object.keys(stats.threeStarWorlds).length >= 1
                // Allow the post-game eval to detect the just-crossed case.
                || ctx?.triggerEvent === 'threeStarWorld';
        },
    },
    {
        id: 'yahtzeeHunter',
        name: 'Yahtzee Hunter',
        description: 'Scored 5 Yahtzees lifetime.',
        hint: 'Five of a kind. Five times.',
        icon: 'fa-dice-d20',
        coinReward: 30,
        xpReward: 150,
        predicate: (stats) => stats.yahtzeesScored >= 5,
    },
    {
        id: 'engageAllKinds',
        name: 'Modifier Master',
        description: 'Engaged all 7 modifier kinds in a single game.',
        hint: 'Use every tool in one go.',
        icon: 'fa-puzzle-piece',
        coinReward: 30,
        xpReward: 150,
        predicate: (_stats, ctx) => {
            const engaged = ctx?.lastGameSummary?.engagedKinds ?? [];
            return ALL_MODIFIER_KINDS.every(k => engaged.includes(k as any));
        },
    },
    {
        id: 'dailyDouble',
        name: 'Daily Visitor',
        description: 'Completed the Daily Puzzle on 2 different days.',
        hint: 'Come back tomorrow.',
        icon: 'fa-calendar-check',
        coinReward: 15,
        xpReward: 75,
        predicate: (stats) => Object.keys(stats.distinctDailyDates).length >= 2,
    },
    {
        id: 'weekStreak',
        name: 'Streak Keeper',
        description: 'Reached a 7-day Daily Puzzle streak.',
        hint: "Don't break the chain.",
        icon: 'fa-fire',
        coinReward: 50,
        xpReward: 300,
        predicate: (stats) => stats.longestDailyStreak >= 7,
    },
    {
        id: 'centurion',
        name: 'Centurion',
        description: '100 games played.',
        icon: 'fa-medal',
        coinReward: 50,
        xpReward: 500,
        hidden: true,
        predicate: (stats) => stats.gamesPlayed >= 100,
    },
];

// Returns achievements that satisfy their predicate AND aren't already
// unlocked on the profile. Caller is expected to applyAchievementUnlock
// for each one to bank the rewards + record the unlock timestamp.
export function evaluateAchievements(
    profile: PlayerProfile,
    ctx?: AchievementCtx,
): AchievementDef[] {
    const out: AchievementDef[] = [];
    for (const def of ACHIEVEMENTS) {
        if (profile.unlocked[def.id]) continue;
        if (def.predicate(profile.stats, ctx)) out.push(def);
    }
    return out;
}

// Idempotent. No-ops if the achievement is already in `unlocked`.
// The achievement's coin/xp rewards are NOT applied here — callers handle
// reward stacking (see rewards.ts).
export function applyAchievementUnlock(
    profile: PlayerProfile,
    def: AchievementDef,
    now: Date = new Date(),
): PlayerProfile {
    if (profile.unlocked[def.id]) return profile;
    return {
        ...profile,
        unlocked: { ...profile.unlocked, [def.id]: now.toISOString() },
    };
}

export function getAchievementById(id: string): AchievementDef | undefined {
    return ACHIEVEMENTS.find(a => a.id === id);
}
