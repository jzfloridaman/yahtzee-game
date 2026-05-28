import { PUZZLE_TEMPLATE } from '../../../config/scorecardTemplates';
import { DailyPuzzleConfig } from '../DailyPuzzleConfig';

describe('DailyPuzzleConfig', () => {
    test('same dateKey produces identical placement across 100 calls', () => {
        const a = new DailyPuzzleConfig('2026-05-28');
        const first = a.build(PUZZLE_TEMPLATE).map(m => `${m.kind}@${m.category}`);
        for (let i = 0; i < 100; i++) {
            const next = a.build(PUZZLE_TEMPLATE).map(m => `${m.kind}@${m.category}`);
            expect(next).toEqual(first);
        }
    });

    test('two fresh instances on the same dateKey produce identical placement', () => {
        const a = new DailyPuzzleConfig('2026-05-28');
        const b = new DailyPuzzleConfig('2026-05-28');
        const av = a.build(PUZZLE_TEMPLATE).map(m => `${m.kind}@${m.category}`);
        const bv = b.build(PUZZLE_TEMPLATE).map(m => `${m.kind}@${m.category}`);
        expect(av).toEqual(bv);
    });

    test('different dateKeys produce different placement (statistical, not guaranteed per pair)', () => {
        const seen = new Set<string>();
        // Sample 14 days; we expect at least 2 distinct placements.
        for (let day = 1; day <= 14; day++) {
            const cfg = new DailyPuzzleConfig(`2026-05-${String(day).padStart(2, '0')}`);
            const sig = cfg.build(PUZZLE_TEMPLATE).map(m => `${m.kind}@${m.category}`).join('|');
            seen.add(sig);
        }
        expect(seen.size).toBeGreaterThan(1);
    });

    test('exposes id, label, dateKey', () => {
        const cfg = new DailyPuzzleConfig('2026-05-28');
        expect(cfg.id).toBe('daily-2026-05-28');
        expect(cfg.dateKey).toBe('2026-05-28');
        expect(cfg.label).toBe('Daily Puzzle');
        expect(cfg.targetScore).toBeGreaterThan(0);
    });
});
