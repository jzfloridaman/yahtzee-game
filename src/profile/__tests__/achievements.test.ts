import {
    ACHIEVEMENTS,
    applyAchievementUnlock,
    evaluateAchievements,
    getAchievementById,
} from '../achievements';
import { emptyProfile, emptyStats } from '../rewards';
import { LEVELS, WORLDS } from '../../puzzle/levels/definitions';
import type { AchievementCtx, AchievementDef } from '../types';
import { GameMode } from '../../enums/GameMode';
import { GameVariant } from '../../enums/GameVariant';

const NOW = new Date('2026-05-28T12:00:00Z');

function withStats(updates: Partial<ReturnType<typeof emptyStats>>) {
    const p = emptyProfile(NOW);
    p.stats = { ...p.stats, ...updates };
    return p;
}

function summary(overrides: Partial<AchievementCtx['lastGameSummary']> = {}): AchievementCtx['lastGameSummary'] {
    return {
        mode: GameMode.SinglePlayer,
        variant: GameVariant.Puzzle,
        totalScore: 200,
        won: true,
        ...overrides,
    };
}

function predicateFires(id: string, profile = emptyProfile(NOW), ctx?: AchievementCtx): boolean {
    const def = getAchievementById(id)!;
    return def.predicate(profile.stats, ctx);
}

describe('achievement set integrity', () => {
    test('every achievement has a stable id, name, icon, and predicate', () => {
        const ids = new Set<string>();
        for (const a of ACHIEVEMENTS) {
            expect(a.id).toBeTruthy();
            expect(a.name).toBeTruthy();
            expect(a.icon).toBeTruthy();
            expect(typeof a.predicate).toBe('function');
            expect(ids.has(a.id)).toBe(false);
            ids.add(a.id);
        }
    });

    test('exactly 12 achievements ship in the starter set', () => {
        expect(ACHIEVEMENTS).toHaveLength(12);
    });
});

describe('predicates', () => {
    test('firstRoll fires once a game has been played', () => {
        expect(predicateFires('firstRoll')).toBe(false);
        expect(predicateFires('firstRoll', withStats({ gamesPlayed: 1 }))).toBe(true);
    });

    test('firstWin fires on rainbow OR puzzle win', () => {
        expect(predicateFires('firstWin', withStats({ rainbowWins: 1 }))).toBe(true);
        expect(predicateFires('firstWin', withStats({ puzzlesWon: 1 }))).toBe(true);
        expect(predicateFires('firstWin')).toBe(false);
    });

    test('firstPuzzle fires on first puzzle completion', () => {
        expect(predicateFires('firstPuzzle', withStats({ puzzlesPlayed: 1 }))).toBe(true);
    });

    test('firstAdventure fires when level 1 is cleared', () => {
        const id = LEVELS[0].id;
        expect(predicateFires('firstAdventure', withStats({ clearedLevelIds: { [id]: true } }))).toBe(true);
        expect(predicateFires('firstAdventure')).toBe(false);
    });

    test('worldClear fires when every level in any world is cleared', () => {
        const world = WORLDS[0];
        const worldLevels = LEVELS.filter(l => l.worldId === world.id);
        const cleared: Record<string, true> = {};
        for (const l of worldLevels) cleared[l.id] = true;
        expect(predicateFires('worldClear', withStats({ clearedLevelIds: cleared }))).toBe(true);

        // Partial clear doesn't fire.
        const partial: Record<string, true> = {};
        partial[worldLevels[0].id] = true;
        expect(predicateFires('worldClear', withStats({ clearedLevelIds: partial }))).toBe(false);
    });

    test('threeStarLevel fires after at least one 3-star', () => {
        expect(predicateFires('threeStarLevel', withStats({ threeStarLevels: 1 }))).toBe(true);
    });

    test('yahtzeeHunter fires at 5 lifetime yahtzees', () => {
        expect(predicateFires('yahtzeeHunter', withStats({ yahtzeesScored: 4 }))).toBe(false);
        expect(predicateFires('yahtzeeHunter', withStats({ yahtzeesScored: 5 }))).toBe(true);
    });

    test('engageAllKinds fires when summary has all 7 engaged kinds', () => {
        const all = ['iceBlock','flyingMultiplier','doubleCategory','hotPotato','multiplierBubble','loopingMultiplier','loopingCategory'] as any;
        const ctx: AchievementCtx = { lastGameSummary: summary({ engagedKinds: all }) };
        expect(predicateFires('engageAllKinds', emptyProfile(NOW), ctx)).toBe(true);
        // Missing one fails.
        const six = all.slice(0, 6);
        expect(predicateFires('engageAllKinds', emptyProfile(NOW), { lastGameSummary: summary({ engagedKinds: six }) })).toBe(false);
    });

    test('dailyDouble fires after 2 distinct dates', () => {
        expect(predicateFires('dailyDouble', withStats({ distinctDailyDates: { '2026-05-28': true } }))).toBe(false);
        expect(predicateFires('dailyDouble', withStats({ distinctDailyDates: { '2026-05-28': true, '2026-05-29': true } }))).toBe(true);
    });

    test('weekStreak fires at 7-day longest streak', () => {
        expect(predicateFires('weekStreak', withStats({ longestDailyStreak: 6 }))).toBe(false);
        expect(predicateFires('weekStreak', withStats({ longestDailyStreak: 7 }))).toBe(true);
    });

    test('centurion fires at 100 games', () => {
        expect(predicateFires('centurion', withStats({ gamesPlayed: 99 }))).toBe(false);
        expect(predicateFires('centurion', withStats({ gamesPlayed: 100 }))).toBe(true);
    });
});

describe('evaluateAchievements + applyAchievementUnlock', () => {
    test('evaluateAchievements returns only newly-true definitions', () => {
        const p = withStats({ gamesPlayed: 1 });
        const newDefs = evaluateAchievements(p);
        expect(newDefs.find(d => d.id === 'firstRoll')).toBeTruthy();
    });

    test('applyAchievementUnlock is idempotent', () => {
        const p = emptyProfile(NOW);
        const def = getAchievementById('firstRoll')!;
        const once = applyAchievementUnlock(p, def, NOW);
        const twice = applyAchievementUnlock(once, def, NOW);
        expect(once.unlocked['firstRoll']).toBeTruthy();
        // Second apply returns the same shape (idempotent).
        expect(twice).toBe(once);
    });

    test('already-unlocked achievements aren\'t in evaluateAchievements output', () => {
        const p = withStats({ gamesPlayed: 1 });
        const unlocked = applyAchievementUnlock(p, getAchievementById('firstRoll')!, NOW);
        const defs: AchievementDef[] = evaluateAchievements(unlocked);
        expect(defs.find(d => d.id === 'firstRoll')).toBeUndefined();
    });
});
