import { Categories } from '../../../enums/Categories';
import { PUZZLE_TEMPLATE } from '../../../config/scorecardTemplates';
import { PuzzleEngine } from '../../PuzzleEngine';
import { FlyingMultiplierModifier } from '../FlyingMultiplierModifier';
import type { PuzzleConfig } from '../../types';

type Scorecard = Partial<Record<Categories, { selected: boolean; value: number | null }>>;

function makeEngine(modifier: FlyingMultiplierModifier, scorecard: Scorecard = {}): PuzzleEngine {
    const engine = new PuzzleEngine(() => scorecard);
    const config: PuzzleConfig = {
        id: 'test', label: 'test', targetScore: 0, requiredEngagementCount: 0,
        build: () => [modifier],
    };
    engine.initFromConfig(config, PUZZLE_TEMPLATE);
    return engine;
}

describe('FlyingMultiplierModifier', () => {
    test('multiplies the raw score when scored on its category', () => {
        const mod = new FlyingMultiplierModifier(Categories.Fives, 2);
        const engine = makeEngine(mod);
        expect(engine.applyScore(Categories.Fives, 15)).toBe(30);
    });

    test('does not affect scores on other categories', () => {
        const mod = new FlyingMultiplierModifier(Categories.Fives, 2);
        const engine = makeEngine(mod);
        expect(engine.applyScore(Categories.Sixes, 24)).toBe(24);
    });

    test('relocates to a different unscored category on turn end', () => {
        const mod = new FlyingMultiplierModifier(Categories.Threes, 2);
        const engine = makeEngine(mod);
        const before = mod.category;
        engine.onTurnEnd();
        expect(mod.category).not.toBe(before);
        // New target must be a valid template category.
        const templateCats = new Set(PUZZLE_TEMPLATE.map(e => e.category));
        expect(templateCats.has(mod.category)).toBe(true);
    });

    test('does not relocate onto an already-scored category', () => {
        const scorecard: Scorecard = {};
        // Mark all but a single category as scored.
        for (const entry of PUZZLE_TEMPLATE) {
            if (entry.category !== Categories.Chance && entry.category !== Categories.Threes) {
                scorecard[entry.category] = { selected: true, value: 5 };
            }
        }
        const mod = new FlyingMultiplierModifier(Categories.Threes, 2);
        const engine = new PuzzleEngine(() => scorecard);
        engine.initFromConfig({ id: 't', label: 't', targetScore: 0, requiredEngagementCount: 0, build: () => [mod] }, PUZZLE_TEMPLATE);
        engine.onTurnEnd();
        expect(mod.category).toBe(Categories.Chance);
    });

    test('stays put if no other unscored category exists', () => {
        const scorecard: Scorecard = {};
        for (const entry of PUZZLE_TEMPLATE) {
            if (entry.category !== Categories.Threes) {
                scorecard[entry.category] = { selected: true, value: 5 };
            }
        }
        const mod = new FlyingMultiplierModifier(Categories.Threes, 2);
        const engine = new PuzzleEngine(() => scorecard);
        engine.initFromConfig({ id: 't', label: 't', targetScore: 0, requiredEngagementCount: 0, build: () => [mod] }, PUZZLE_TEMPLATE);
        engine.onTurnEnd();
        expect(mod.category).toBe(Categories.Threes);
    });
});
