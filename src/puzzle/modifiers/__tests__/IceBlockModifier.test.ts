import { Categories } from '../../../enums/Categories';
import { CategoryGroup } from '../../../enums/CategoryGroup';
import { PUZZLE_TEMPLATE } from '../../../config/scorecardTemplates';
import { PuzzleEngine } from '../../PuzzleEngine';
import { IceBlockModifier } from '../IceBlockModifier';
import type { PuzzleConfig } from '../../types';

type Scorecard = Partial<Record<Categories, { selected: boolean; value: number | null }>>;

function makeEngine(modifier: IceBlockModifier, scorecard: Scorecard = {}): PuzzleEngine {
    const engine = new PuzzleEngine(() => scorecard);
    const config: PuzzleConfig = {
        id: 'test', label: 'test', targetScore: 0, requiredEngagementCount: 0,
        build: () => [modifier],
    };
    engine.initFromConfig(config, PUZZLE_TEMPLATE);
    return engine;
}

describe('IceBlockModifier', () => {
    test('canScore vetoes its own category, allows others', () => {
        const mod = new IceBlockModifier(Categories.Threes);
        const engine = makeEngine(mod);
        expect(engine.canScore(Categories.Threes)).toBe(false);
        expect(engine.canScore(Categories.Twos)).toBe(true);
        expect(engine.canScore(Categories.Fours)).toBe(true);
    });

    test('clears when the category above is scored > 0', () => {
        const mod = new IceBlockModifier(Categories.Threes);
        const engine = makeEngine(mod);
        engine.afterScore(Categories.Twos, 4);
        expect(engine.getModifierAt(Categories.Threes)).toBeUndefined();
    });

    test('clears when the category below is scored > 0', () => {
        const mod = new IceBlockModifier(Categories.Threes);
        const engine = makeEngine(mod);
        engine.afterScore(Categories.Fours, 8);
        expect(engine.getModifierAt(Categories.Threes)).toBeUndefined();
    });

    test('does not clear on adjacent score of 0', () => {
        const mod = new IceBlockModifier(Categories.Threes);
        const engine = makeEngine(mod);
        engine.afterScore(Categories.Twos, 0);
        expect(engine.getModifierAt(Categories.Threes)).toBe(mod);
    });

    test('does not clear on a non-adjacent score', () => {
        const mod = new IceBlockModifier(Categories.Threes);
        const engine = makeEngine(mod);
        engine.afterScore(Categories.Sixes, 24);
        expect(engine.getModifierAt(Categories.Threes)).toBe(mod);
    });

    test('block at top of template only clears from below', () => {
        const mod = new IceBlockModifier(Categories.Ones);
        const engine = makeEngine(mod);
        // There is no "above" Ones in PUZZLE_TEMPLATE — Ones is the first
        // entry. Below is Twos.
        engine.afterScore(Categories.Twos, 4);
        expect(engine.getModifierAt(Categories.Ones)).toBeUndefined();
    });

    test('block at bottom of template only clears from above', () => {
        // PUZZLE_TEMPLATE's last entry is Yahtzee.
        const last = PUZZLE_TEMPLATE[PUZZLE_TEMPLATE.length - 1].category;
        const secondToLast = PUZZLE_TEMPLATE[PUZZLE_TEMPLATE.length - 2].category;
        const mod = new IceBlockModifier(last);
        const engine = makeEngine(mod);
        engine.afterScore(secondToLast, 25);
        expect(engine.getModifierAt(last)).toBeUndefined();
    });
});
