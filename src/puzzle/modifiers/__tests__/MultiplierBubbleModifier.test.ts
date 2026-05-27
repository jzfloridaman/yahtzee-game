import { Categories } from '../../../enums/Categories';
import { PUZZLE_TEMPLATE } from '../../../config/scorecardTemplates';
import { PuzzleEngine } from '../../PuzzleEngine';
import { MultiplierBubbleModifier } from '../MultiplierBubbleModifier';
import { FlyingMultiplierModifier } from '../FlyingMultiplierModifier';
import type { PuzzleConfig } from '../../types';

type Scorecard = Partial<Record<Categories, { selected: boolean; value: number | null }>>;

function makeEngine(modifier: MultiplierBubbleModifier, scorecard: Scorecard = {}): PuzzleEngine {
    const engine = new PuzzleEngine(() => scorecard);
    const config: PuzzleConfig = {
        id: 'test', label: 'test', targetScore: 0, requiredEngagementCount: 0,
        build: () => [modifier],
    };
    engine.initFromConfig(config, PUZZLE_TEMPLATE);
    return engine;
}

describe('MultiplierBubbleModifier', () => {
    test('scatters flying multiplier chips when its cell is scored', () => {
        const bubble = new MultiplierBubbleModifier(Categories.ThreeOfAKind, 3, 2);
        const engine = makeEngine(bubble);
        engine.afterScore(Categories.ThreeOfAKind, 15);
        const flyers = engine.getModifiersOfKind('flyingMultiplier');
        expect(flyers.length).toBe(3);
        // Each chip must land on a distinct, unscored, non-bubble cell.
        const cats = new Set(flyers.map(m => m.category));
        expect(cats.size).toBe(3);
        expect(cats.has(Categories.ThreeOfAKind)).toBe(false);
        for (const f of flyers) {
            expect((f as FlyingMultiplierModifier).multiplier).toBe(2);
        }
        // Bubble itself is consumed.
        expect(engine.getModifierAt(Categories.ThreeOfAKind)).toBeUndefined();
    });

    test('marks engaged when at least one chip is placed', () => {
        const bubble = new MultiplierBubbleModifier(Categories.ThreeOfAKind);
        const engine = makeEngine(bubble);
        engine.afterScore(Categories.ThreeOfAKind, 15);
        expect(engine.isKindEngaged('multiplierBubble')).toBe(true);
    });

    test('scoring a different cell does not pop the bubble', () => {
        const bubble = new MultiplierBubbleModifier(Categories.ThreeOfAKind);
        const engine = makeEngine(bubble);
        engine.afterScore(Categories.Sixes, 24);
        expect(engine.getModifierAt(Categories.ThreeOfAKind)).toBe(bubble);
        expect(engine.getModifiersOfKind('flyingMultiplier')).toHaveLength(0);
    });

    test('caps scatter at the number of available cells', () => {
        // Realistic state when afterScore fires: the just-scored cell
        // (ThreeOfAKind) is already marked selected on the scorecard. Leave
        // only Chance and Yahtzee free so scatter can place at most 2 chips.
        const scorecard: Scorecard = {};
        for (const entry of PUZZLE_TEMPLATE) {
            if (entry.category !== Categories.Chance && entry.category !== Categories.Yahtzee) {
                scorecard[entry.category] = { selected: true, value: 5 };
            }
        }
        const bubble = new MultiplierBubbleModifier(Categories.ThreeOfAKind, 3, 2);
        const engine = makeEngine(bubble, scorecard);
        engine.afterScore(Categories.ThreeOfAKind, 15);
        const flyers = engine.getModifiersOfKind('flyingMultiplier');
        expect(flyers.length).toBe(2);
    });
});
