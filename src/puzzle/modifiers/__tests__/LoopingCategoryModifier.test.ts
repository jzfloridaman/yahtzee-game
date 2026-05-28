import { Categories } from '../../../enums/Categories';
import { PUZZLE_TEMPLATE } from '../../../config/scorecardTemplates';
import { PuzzleEngine } from '../../PuzzleEngine';
import { LoopingCategoryModifier } from '../LoopingCategoryModifier';
import { FlyingMultiplierModifier } from '../FlyingMultiplierModifier';
import type { PuzzleConfig, PuzzleModifier } from '../../types';
import type { Die } from '../../../types/Die';

function makeEngine(modifiers: PuzzleModifier[]): PuzzleEngine {
    const engine = new PuzzleEngine(() => ({}));
    const config: PuzzleConfig = {
        id: 'test', label: 'test', targetScore: 0, requiredEngagementCount: 0,
        build: () => modifiers,
    };
    engine.initFromConfig(config, PUZZLE_TEMPLATE);
    return engine;
}

function dice(values: number[]): Die[] {
    return values.map(v => ({ value: v, held: false, isRolling: false }));
}

describe('LoopingCategoryModifier', () => {
    test('rejects an empty cycle', () => {
        expect(() => new LoopingCategoryModifier(Categories.Twos, { cycle: [] }))
            .toThrow();
    });

    test('cycle advances by one each turn end and wraps around', () => {
        const mod = new LoopingCategoryModifier(Categories.ThreeOfAKind, {
            cycle: [Categories.ThreeOfAKind, Categories.FourOfAKind, Categories.Chance],
            start: 0,
        });
        const engine = makeEngine([mod]);
        const observed: Categories[] = [mod.activeCategory];
        for (let i = 0; i < 5; i++) {
            engine.onTurnEnd();
            observed.push(mod.activeCategory);
        }
        expect(observed).toEqual([
            Categories.ThreeOfAKind,
            Categories.FourOfAKind,
            Categories.Chance,
            Categories.ThreeOfAKind,
            Categories.FourOfAKind,
            Categories.Chance,
        ]);
    });

    test('score is recomputed using the active category, not the slot category', () => {
        // Slot lives on Twos but cycle is parked at Yahtzee. Rolling five 5s
        // should score 50 (Yahtzee), not 0 (sum of 2s in [5,5,5,5,5]).
        const mod = new LoopingCategoryModifier(Categories.Twos, {
            cycle: [Categories.Yahtzee],
        });
        const engine = makeEngine([mod]);
        // Raw was computed against Twos (would be 0 for five 5s) — engine
        // doesn't care about the raw value once the modifier substitutes.
        expect(engine.applyScore(Categories.Twos, 0, dice([5, 5, 5, 5, 5]))).toBe(50);
    });

    test('engagement gated on positive score AND non-default active category', () => {
        const mod = new LoopingCategoryModifier(Categories.ThreeOfAKind, {
            cycle: [Categories.ThreeOfAKind, Categories.Yahtzee],
            start: 0,
        });
        const engine = makeEngine([mod]);

        // Index 0: active === slotCategory. Scoring banks raw; no engagement.
        engine.afterScore(Categories.ThreeOfAKind, 16);
        expect(engine.isKindEngaged('loopingCategory')).toBe(false);

        // Index 1: active = Yahtzee.
        engine.onTurnEnd();
        engine.afterScore(Categories.ThreeOfAKind, 50);
        expect(engine.isKindEngaged('loopingCategory')).toBe(true);
    });

    test('zero score does not engage even when active category is non-default', () => {
        const mod = new LoopingCategoryModifier(Categories.ThreeOfAKind, {
            cycle: [Categories.Yahtzee],
        });
        const engine = makeEngine([mod]);
        engine.afterScore(Categories.ThreeOfAKind, 0);
        expect(engine.isKindEngaged('loopingCategory')).toBe(false);
    });

    test('cycle length 1 always substitutes (degenerate but valid)', () => {
        const mod = new LoopingCategoryModifier(Categories.Twos, {
            cycle: [Categories.Chance],
        });
        const engine = makeEngine([mod]);
        // five 3s as Chance = 15
        expect(engine.applyScore(Categories.Twos, 0, dice([3, 3, 3, 3, 3]))).toBe(15);
        engine.onTurnEnd();
        // After cycle advance with length 1, still on Chance.
        expect(mod.activeCategory).toBe(Categories.Chance);
    });

    test('when active category equals slot category, raw passes through unchanged', () => {
        const mod = new LoopingCategoryModifier(Categories.Yahtzee, {
            cycle: [Categories.Yahtzee, Categories.Chance],
            start: 0,
        });
        const engine = makeEngine([mod]);
        // Raw 50 (yahtzee), active === slot — no recompute.
        expect(engine.applyScore(Categories.Yahtzee, 50, dice([4, 4, 4, 4, 4]))).toBe(50);
    });

    test('integrates with FlyingMultiplier on the same cell: substituted score is doubled', () => {
        const loop = new LoopingCategoryModifier(Categories.Twos, {
            cycle: [Categories.Yahtzee],
        });
        const flying = new FlyingMultiplierModifier(Categories.Twos, 2);
        const engine = makeEngine([loop, flying]);
        // Loop recomputes to 50 (Yahtzee), Flying doubles to 100.
        expect(engine.applyScore(Categories.Twos, 0, dice([5, 5, 5, 5, 5]))).toBe(100);
    });

    test('emits loopingCategory:cycle on turn end with the new active category', () => {
        const mod = new LoopingCategoryModifier(Categories.Twos, {
            cycle: [Categories.Twos, Categories.Chance],
        });
        const engine = makeEngine([mod]);
        const events: any[] = [];
        engine.on(e => { if (e.type.startsWith('loopingCategory')) events.push(e); });
        engine.onTurnEnd();
        expect(events).toHaveLength(1);
        expect(events[0]).toMatchObject({
            type: 'loopingCategory:cycle',
            category: Categories.Twos,
            activeCategory: Categories.Chance,
            index: 1,
            total: 2,
        });
    });

    test('emits loopingCategory:applied when a substitution happens', () => {
        const mod = new LoopingCategoryModifier(Categories.Twos, {
            cycle: [Categories.Yahtzee],
        });
        const engine = makeEngine([mod]);
        const events: any[] = [];
        engine.on(e => { if (e.type === 'loopingCategory:applied') events.push(e); });
        engine.applyScore(Categories.Twos, 0, dice([6, 6, 6, 6, 6]));
        expect(events).toHaveLength(1);
        expect(events[0]).toMatchObject({
            type: 'loopingCategory:applied',
            category: Categories.Twos,
            raw: 0,
            final: 50,
            active: Categories.Yahtzee,
        });
    });
});
