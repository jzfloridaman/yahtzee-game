import { Categories } from '../../../enums/Categories';
import { PUZZLE_TEMPLATE } from '../../../config/scorecardTemplates';
import { PuzzleEngine } from '../../PuzzleEngine';
import { LoopingMultiplierModifier } from '../LoopingMultiplierModifier';
import type { PuzzleConfig } from '../../types';

function makeEngine(modifier: LoopingMultiplierModifier): PuzzleEngine {
    const engine = new PuzzleEngine(() => ({}));
    const config: PuzzleConfig = {
        id: 'test', label: 'test', targetScore: 0, requiredEngagementCount: 0,
        build: () => [modifier],
    };
    engine.initFromConfig(config, PUZZLE_TEMPLATE);
    return engine;
}

describe('LoopingMultiplierModifier', () => {
    test('multiplies the score on its own category by current value', () => {
        const mod = new LoopingMultiplierModifier(Categories.Yahtzee, { min: 1, max: 3, start: 2 });
        const engine = makeEngine(mod);
        expect(engine.applyScore(Categories.Yahtzee, 50)).toBe(100);
    });

    test('triangle-waves the value across turn ends', () => {
        const mod = new LoopingMultiplierModifier(Categories.Yahtzee, { min: 1, max: 3, start: 1 });
        const engine = makeEngine(mod);
        // start at 1 → 2 → 3 → 2 → 1 → 2 → 3
        const observed: number[] = [mod.value];
        for (let i = 0; i < 6; i++) {
            engine.onTurnEnd();
            observed.push(mod.value);
        }
        expect(observed).toEqual([1, 2, 3, 2, 1, 2, 3]);
    });

    test('engages only when banked score is positive AND multiplier is above 1', () => {
        const mod = new LoopingMultiplierModifier(Categories.Yahtzee, { min: 1, max: 3, start: 1 });
        const engine = makeEngine(mod);
        engine.afterScore(Categories.Yahtzee, 50); // value=1, no engagement
        expect(engine.isKindEngaged('loopingMultiplier')).toBe(false);
        engine.onTurnEnd(); // value → 2
        engine.afterScore(Categories.Yahtzee, 100); // boosted
        expect(engine.isKindEngaged('loopingMultiplier')).toBe(true);
    });
});
