import { applyXpGain, levelForXp, xpForLevel, xpToNextLevel } from '../xp';
import { emptyProfile } from '../rewards';

describe('xp curve', () => {
    test('threshold values match the documented curve', () => {
        expect(xpForLevel(1)).toBe(0);
        expect(xpForLevel(2)).toBe(100);
        expect(xpForLevel(3)).toBe(300);
        expect(xpForLevel(5)).toBe(1000);
        expect(xpForLevel(10)).toBe(4500);
        expect(xpForLevel(20)).toBe(19000);
    });

    test('xpForLevel is strictly monotonic', () => {
        let prev = -1;
        for (let n = 1; n <= 30; n++) {
            const val = xpForLevel(n);
            expect(val).toBeGreaterThan(prev);
            prev = val;
        }
    });

    test('levelForXp is the inverse of xpForLevel', () => {
        for (let n = 1; n <= 20; n++) {
            expect(levelForXp(xpForLevel(n))).toBe(n);
            // One XP under the threshold lands on the previous level.
            if (n > 1) expect(levelForXp(xpForLevel(n) - 1)).toBe(n - 1);
        }
    });

    test('xpToNextLevel reports progress correctly', () => {
        const prog = xpToNextLevel(150);
        expect(prog.level).toBe(2);
        expect(prog.xpForCurrentLevel).toBe(100);
        expect(prog.xpForNextLevel).toBe(300);
        expect(prog.xpIntoLevel).toBe(50);
        expect(prog.xpNeededToNext).toBe(150);
    });

    test('applyXpGain reports levels gained (multi-level jump)', () => {
        const p = emptyProfile(new Date('2026-05-28T00:00:00Z'));
        const { profile, levelsGained } = applyXpGain(p, 350);
        expect(profile.xp).toBe(350);
        expect(profile.level).toBe(3);
        expect(levelsGained).toBe(2);
    });

    test('applyXpGain with amount=0 is a no-op', () => {
        const p = emptyProfile(new Date('2026-05-28T00:00:00Z'));
        const { profile, levelsGained } = applyXpGain(p, 0);
        expect(profile).toBe(p);
        expect(levelsGained).toBe(0);
    });
});
