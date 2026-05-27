import { Categories } from '../../../enums/Categories';
import { PUZZLE_TEMPLATE } from '../../../config/scorecardTemplates';
import { PuzzleEngine } from '../../PuzzleEngine';
import { DoubleCategoryModifier } from '../DoubleCategoryModifier';
import type { PuzzleConfig } from '../../types';

type Scorecard = Partial<Record<Categories, { selected: boolean; value: number | null }>>;

function makeEngine(modifier: DoubleCategoryModifier, scorecard: Scorecard = {}): PuzzleEngine {
    const engine = new PuzzleEngine(() => scorecard);
    const config: PuzzleConfig = {
        id: 'test', label: 'test', targetScore: 0, requiredEngagementCount: 0,
        build: () => [modifier],
    };
    engine.initFromConfig(config, PUZZLE_TEMPLATE);
    return engine;
}

describe('DoubleCategoryModifier', () => {
    test('first score on own category queues a bonus turn, modifier stays', () => {
        const mod = new DoubleCategoryModifier(Categories.FullHouse);
        const engine = makeEngine(mod);
        engine.afterScore(Categories.FullHouse, 25);
        expect(engine.getPendingBonusCategory()).toBe(Categories.FullHouse);
        expect(engine.getModifierAt(Categories.FullHouse)).toBe(mod);
    });

    test('second score on own category removes the modifier', () => {
        const mod = new DoubleCategoryModifier(Categories.FullHouse);
        const engine = makeEngine(mod);
        engine.afterScore(Categories.FullHouse, 25);
        engine.consumePendingBonusCategory();
        engine.afterScore(Categories.FullHouse, 25);
        expect(engine.getModifierAt(Categories.FullHouse)).toBeUndefined();
    });

    test('ignores scoring on other categories', () => {
        const mod = new DoubleCategoryModifier(Categories.FullHouse);
        const engine = makeEngine(mod);
        engine.afterScore(Categories.Sixes, 24);
        expect(engine.getPendingBonusCategory()).toBeNull();
        expect(engine.getModifierAt(Categories.FullHouse)).toBe(mod);
    });
});
