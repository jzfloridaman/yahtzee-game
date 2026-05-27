import { applyWinToProgress, computeStars, type AdventureProgress } from '../progression';

const fresh = (): AdventureProgress => ({ highestUnlocked: 1, bestScores: {}, bestStars: {} });

describe('computeStars', () => {
    test('returns 0 when below target', () => {
        expect(computeStars(99, 100)).toBe(0);
    });
    test('returns 1 at exactly the target', () => {
        expect(computeStars(100, 100)).toBe(1);
    });
    test('returns 2 at +25% over target', () => {
        expect(computeStars(125, 100)).toBe(2);
    });
    test('returns 3 at +50% over target', () => {
        expect(computeStars(150, 100)).toBe(3);
    });
    test('caps at 3 stars regardless of how high the score goes', () => {
        expect(computeStars(10000, 100)).toBe(3);
    });
});

describe('applyWinToProgress', () => {
    test('records the score when no previous best exists', () => {
        const next = applyWinToProgress(fresh(), 'l01', 1, 150, 15);
        expect(next.bestScores['l01']).toBe(150);
    });

    test('keeps existing best when new score is lower', () => {
        const start: AdventureProgress = { highestUnlocked: 2, bestScores: { 'l01': 200 } };
        const next = applyWinToProgress(start, 'l01', 1, 150, 15);
        expect(next.bestScores['l01']).toBe(200);
    });

    test('updates best when new score is higher', () => {
        const start: AdventureProgress = { highestUnlocked: 2, bestScores: { 'l01': 200 } };
        const next = applyWinToProgress(start, 'l01', 1, 250, 15);
        expect(next.bestScores['l01']).toBe(250);
    });

    test('bumps highestUnlocked when clearing the current ceiling', () => {
        const next = applyWinToProgress(fresh(), 'l01', 1, 100, 15);
        expect(next.highestUnlocked).toBe(2);
    });

    test('does not bump unlock when clearing an already-unlocked earlier level', () => {
        const start: AdventureProgress = { highestUnlocked: 5, bestScores: {} };
        const next = applyWinToProgress(start, 'l02', 2, 100, 15);
        expect(next.highestUnlocked).toBe(5);
    });

    test('caps highestUnlocked at the final level', () => {
        const start: AdventureProgress = { highestUnlocked: 15, bestScores: {} };
        const next = applyWinToProgress(start, 'l15', 15, 400, 15);
        expect(next.highestUnlocked).toBe(15);
    });

    test('returns a NEW object so reactive subscribers fire', () => {
        const start = fresh();
        const next = applyWinToProgress(start, 'l01', 1, 100, 15);
        expect(next).not.toBe(start);
        expect(next.bestScores).not.toBe(start.bestScores);
    });

    test('records earned stars when higher than the prior best', () => {
        const next = applyWinToProgress(fresh(), 'l01', 1, 150, 15, 2);
        expect(next.bestStars?.['l01']).toBe(2);
    });

    test('keeps the higher star rating across replays', () => {
        const after2 = applyWinToProgress(fresh(), 'l01', 1, 150, 15, 2);
        const after1 = applyWinToProgress(after2, 'l01', 1, 100, 15, 1);
        expect(after1.bestStars?.['l01']).toBe(2);
    });
});
