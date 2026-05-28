import {
    applyDailyResult,
    currentStreakFor,
    defaultProgress,
    hasPlayedToday,
    loadDailyProgress,
    recentHistory,
} from '../dailyProgress';
import type { DailyPuzzleProgress } from '../types';

describe('dailyProgress', () => {
    test('loadDailyProgress returns default when input is null', () => {
        const p = loadDailyProgress(null);
        expect(p).toEqual(defaultProgress());
    });

    test('loadDailyProgress recovers from corrupt JSON', () => {
        expect(loadDailyProgress('{not json')).toEqual(defaultProgress());
        expect(loadDailyProgress('null')).toEqual(defaultProgress());
    });

    test('loadDailyProgress passes through a valid entry', () => {
        const valid: DailyPuzzleProgress = {
            version: 1,
            bestScore: 220,
            currentStreak: 3,
            longestStreak: 5,
            lastPlayedDateKey: '2026-05-28',
            history: [{ dateKey: '2026-05-28', score: 220, won: true }],
        };
        expect(loadDailyProgress(JSON.stringify(valid))).toEqual(valid);
    });

    test('first win starts the streak at 1', () => {
        const after = applyDailyResult(
            defaultProgress(),
            { dateKey: '2026-05-28', score: 150, won: true },
            '2026-05-28',
        );
        expect(after.currentStreak).toBe(1);
        expect(after.longestStreak).toBe(1);
        expect(after.bestScore).toBe(150);
        expect(after.lastPlayedDateKey).toBe('2026-05-28');
    });

    test('consecutive wins extend the streak', () => {
        let p = defaultProgress();
        p = applyDailyResult(p, { dateKey: '2026-05-28', score: 100, won: true }, '2026-05-28');
        p = applyDailyResult(p, { dateKey: '2026-05-29', score: 110, won: true }, '2026-05-29');
        p = applyDailyResult(p, { dateKey: '2026-05-30', score: 120, won: true }, '2026-05-30');
        expect(p.currentStreak).toBe(3);
        expect(p.longestStreak).toBe(3);
        expect(p.bestScore).toBe(120);
    });

    test('a loss resets the streak to 0 but preserves longest', () => {
        let p = defaultProgress();
        p = applyDailyResult(p, { dateKey: '2026-05-28', score: 200, won: true }, '2026-05-28');
        p = applyDailyResult(p, { dateKey: '2026-05-29', score: 180, won: true }, '2026-05-29');
        p = applyDailyResult(p, { dateKey: '2026-05-30', score: 50,  won: false }, '2026-05-30');
        expect(p.currentStreak).toBe(0);
        expect(p.longestStreak).toBe(2);
    });

    test('a gap day resets to 1 on the next win', () => {
        let p = defaultProgress();
        p = applyDailyResult(p, { dateKey: '2026-05-28', score: 100, won: true }, '2026-05-28');
        // Skipped 5/29 entirely.
        p = applyDailyResult(p, { dateKey: '2026-05-30', score: 110, won: true }, '2026-05-30');
        expect(p.currentStreak).toBe(1);
        expect(p.longestStreak).toBe(1);
    });

    test('replaying today is a no-op', () => {
        let p = defaultProgress();
        p = applyDailyResult(p, { dateKey: '2026-05-28', score: 100, won: true }, '2026-05-28');
        const after = applyDailyResult(p, { dateKey: '2026-05-28', score: 999, won: true }, '2026-05-28');
        expect(after).toBe(p);
        expect(after.bestScore).toBe(100);
    });

    test('currentStreakFor returns 0 when the last play is stale (>1 day gap)', () => {
        let p = defaultProgress();
        p = applyDailyResult(p, { dateKey: '2026-05-25', score: 100, won: true }, '2026-05-25');
        expect(currentStreakFor(p, '2026-05-28')).toBe(0);
        expect(currentStreakFor(p, '2026-05-26')).toBe(1); // adjacent day still valid
        expect(currentStreakFor(p, '2026-05-25')).toBe(1); // same day
    });

    test('hasPlayedToday compares against lastPlayedDateKey', () => {
        const p = applyDailyResult(
            defaultProgress(),
            { dateKey: '2026-05-28', score: 100, won: true },
            '2026-05-28',
        );
        expect(hasPlayedToday(p, '2026-05-28')).toBe(true);
        expect(hasPlayedToday(p, '2026-05-29')).toBe(false);
    });

    test('history is bounded and de-duplicates by date', () => {
        let p = defaultProgress();
        for (let i = 0; i < 35; i++) {
            const day = i + 1; // not real dates but unique keys is enough
            p = applyDailyResult(
                p,
                { dateKey: `2026-05-${String(day).padStart(2, '0')}`, score: i, won: i % 2 === 0 },
                `2026-05-${String(day).padStart(2, '0')}`,
            );
        }
        expect(p.history.length).toBe(30);
        expect(recentHistory(p, 7).length).toBe(7);
        // Newest first.
        expect(p.history[0].score).toBe(34);
    });
});
