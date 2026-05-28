import { GameMode } from '../../enums/GameMode';
import { GameVariant } from '../../enums/GameVariant';
import { applyRewards, computeGameRewards, emptyProfile } from '../rewards';
import type { GameSummary } from '../types';

const NOW = new Date('2026-05-28T12:00:00Z');

function baseSummary(overrides: Partial<GameSummary> = {}): GameSummary {
    return {
        mode: GameMode.SinglePlayer,
        variant: GameVariant.Puzzle,
        totalScore: 150,
        won: true,
        ...overrides,
    };
}

describe('computeGameRewards', () => {
    test('rainbow loss awards base XP only', () => {
        const r = computeGameRewards(
            baseSummary({ variant: GameVariant.Rainbow, won: false }),
            emptyProfile(NOW),
        );
        expect(r.xpGained).toBe(25);
        expect(r.coinsGained).toBe(0);
    });

    test('rainbow win pays the win bonus', () => {
        const r = computeGameRewards(
            baseSummary({ variant: GameVariant.Rainbow, won: true }),
            emptyProfile(NOW),
        );
        expect(r.xpGained).toBe(50);
    });

    test('puzzle loss awards base XP only', () => {
        const r = computeGameRewards(
            baseSummary({ variant: GameVariant.Puzzle, won: false }),
            emptyProfile(NOW),
        );
        expect(r.xpGained).toBe(40);
        expect(r.coinsGained).toBe(0);
    });

    test('puzzle win pays the win bonus', () => {
        const r = computeGameRewards(
            baseSummary({ variant: GameVariant.Puzzle, won: true }),
            emptyProfile(NOW),
        );
        expect(r.xpGained).toBe(100);  // 40 base + 60 win
    });

    test('first-time adventure clear pays the first-clear XP', () => {
        const r = computeGameRewards(
            baseSummary({ levelId: 'l01-first-roll', levelNumber: 1, starsEarned: 1 }),
            emptyProfile(NOW),
        );
        expect(r.xpGained).toBe(40 + 60 + 100);
    });

    test('replaying an already-cleared adventure level skips first-clear XP', () => {
        const profile = emptyProfile(NOW);
        profile.stats.clearedLevelIds['l01-first-roll'] = true;
        const r = computeGameRewards(
            baseSummary({ levelId: 'l01-first-roll', levelNumber: 1, starsEarned: 1 }),
            profile,
        );
        expect(r.xpGained).toBe(40 + 60);
    });

    test('3-star clear pays the 3-star coin bonus + +25 per extra star', () => {
        const r = computeGameRewards(
            baseSummary({ levelId: 'l01-first-roll', levelNumber: 1, starsEarned: 3 }),
            emptyProfile(NOW),
        );
        expect(r.coinsGained).toBe(15);
        // 40 + 60 win + 100 first-clear + 25 (2-star bonus) + 25 (3-star bonus)
        expect(r.xpGained).toBe(40 + 60 + 100 + 25 + 25);
    });

    test('daily win pays daily bonuses + streak coins', () => {
        const r = computeGameRewards(
            baseSummary({ dailyDateKey: '2026-05-28', dailyStreakAfter: 3 }),
            emptyProfile(NOW),
        );
        // 40 + 60 win + 50 daily + 100 daily win + 30 (streak xp) + 10 + 15 (streak coins)
        expect(r.xpGained).toBe(40 + 60 + 50 + 100 + 30);
        expect(r.coinsGained).toBe(10 + 15);
    });

    test('streak XP and coin bonuses cap', () => {
        const r = computeGameRewards(
            baseSummary({ dailyDateKey: '2026-05-28', dailyStreakAfter: 30 }),
            emptyProfile(NOW),
        );
        // Streak xp cap = +100 (10 * 30 = 300, clamped to 100)
        // Streak coins cap = +30 (5 * 30 = 150, clamped to 30)
        expect(r.xpGained).toBe(40 + 60 + 50 + 100 + 100);
        expect(r.coinsGained).toBe(10 + 30);
    });
});

describe('applyRewards', () => {
    test('awards XP, levels up, and pays level-up coins', () => {
        // Pre-unlock firstRoll + firstWin so this test isolates the base
        // XP/level-up path from achievement bonuses (those are covered
        // separately).
        const p = emptyProfile(NOW);
        p.unlocked['firstRoll'] = NOW.toISOString();
        p.unlocked['firstWin'] = NOW.toISOString();
        const rewards = { xpGained: 200, coinsGained: 0, levelsGained: 0, newAchievements: [] };
        const summary = baseSummary({ variant: GameVariant.Rainbow });
        const { profile, rewards: out } = applyRewards(p, rewards, summary, NOW);
        expect(profile.xp).toBe(200);
        expect(profile.level).toBe(2);
        // Level-up coins = 50.
        expect(out.coinsGained).toBeGreaterThanOrEqual(50);
        expect(profile.coins).toBeGreaterThanOrEqual(50);
    });

    test('mutates lifetime stats for the summarized game', () => {
        const p = emptyProfile(NOW);
        const rewards = { xpGained: 25, coinsGained: 0, levelsGained: 0, newAchievements: [] };
        const summary = baseSummary({
            variant: GameVariant.Rainbow,
            won: true,
            totalScore: 240,
            yahtzeesScored: 1,
        });
        const { profile } = applyRewards(p, rewards, summary, NOW);
        expect(profile.stats.gamesPlayed).toBe(1);
        expect(profile.stats.rainbowWins).toBe(1);
        expect(profile.stats.yahtzeesScored).toBe(1);
        expect(profile.stats.highestSingleGameScore).toBe(240);
    });

    test('unlocks "firstWin" achievement on first rainbow MP win', () => {
        const p = emptyProfile(NOW);
        const rewards = computeGameRewards(
            baseSummary({ variant: GameVariant.Rainbow, won: true }),
            p,
        );
        const out = applyRewards(p, rewards, baseSummary({ variant: GameVariant.Rainbow, won: true }), NOW);
        const ids = out.rewards.newAchievements.map(a => a.id);
        expect(ids).toContain('firstWin');
        // Achievement stacks coins + XP.
        expect(out.rewards.coinsGained).toBeGreaterThan(rewards.coinsGained);
    });
});
