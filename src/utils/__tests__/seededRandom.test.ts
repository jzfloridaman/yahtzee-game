import { mulberry32, hashString } from '../seededRandom';
import { getDailyDateKey, daysBetween } from '../dailyDate';

describe('seededRandom', () => {
    test('same seed produces same sequence', () => {
        const a = mulberry32(123);
        const b = mulberry32(123);
        for (let i = 0; i < 100; i++) {
            expect(a()).toBe(b());
        }
    });

    test('different seeds produce different first values', () => {
        const a = mulberry32(1);
        const b = mulberry32(2);
        expect(a()).not.toBe(b());
    });

    test('output stays within [0, 1)', () => {
        const r = mulberry32(42);
        for (let i = 0; i < 1000; i++) {
            const v = r();
            expect(v).toBeGreaterThanOrEqual(0);
            expect(v).toBeLessThan(1);
        }
    });

    test('hashString is deterministic and varies with input', () => {
        expect(hashString('2026-05-28')).toBe(hashString('2026-05-28'));
        expect(hashString('2026-05-28')).not.toBe(hashString('2026-05-29'));
        expect(hashString('')).toBe(0x811c9dc5);
    });
});

describe('dailyDate', () => {
    test('getDailyDateKey returns YYYY-MM-DD in UTC', () => {
        // Use a known fixed moment: 2026-05-28 12:00 UTC.
        const d = new Date(Date.UTC(2026, 4, 28, 12, 0, 0));
        expect(getDailyDateKey(d)).toBe('2026-05-28');
    });

    test('getDailyDateKey rolls over at UTC midnight', () => {
        const d = new Date(Date.UTC(2026, 4, 28, 23, 59, 59));
        expect(getDailyDateKey(d)).toBe('2026-05-28');
        const next = new Date(Date.UTC(2026, 4, 29, 0, 0, 1));
        expect(getDailyDateKey(next)).toBe('2026-05-29');
    });

    test('daysBetween is signed integer count', () => {
        expect(daysBetween('2026-05-28', '2026-05-29')).toBe(1);
        expect(daysBetween('2026-05-28', '2026-05-28')).toBe(0);
        expect(daysBetween('2026-05-29', '2026-05-28')).toBe(-1);
        expect(daysBetween('2026-05-01', '2026-06-01')).toBe(31);
    });
});
