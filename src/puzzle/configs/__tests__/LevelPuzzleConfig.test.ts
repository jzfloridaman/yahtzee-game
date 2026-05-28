import { Categories } from '../../../enums/Categories';
import { PUZZLE_TEMPLATE } from '../../../config/scorecardTemplates';
import { LevelPuzzleConfig } from '../LevelPuzzleConfig';
import type { LevelDefinition } from '../../levels/types';
import { IceBlockModifier } from '../../modifiers/IceBlockModifier';
import { FlyingMultiplierModifier } from '../../modifiers/FlyingMultiplierModifier';
import { DoubleCategoryModifier } from '../../modifiers/DoubleCategoryModifier';
import { HotPotatoModifier } from '../../modifiers/HotPotatoModifier';
import { MultiplierBubbleModifier } from '../../modifiers/MultiplierBubbleModifier';
import { LoopingMultiplierModifier } from '../../modifiers/LoopingMultiplierModifier';
import { LoopingCategoryModifier } from '../../modifiers/LoopingCategoryModifier';
import { LEVELS } from '../../levels/definitions';

const sample: LevelDefinition = {
    id: 'test-level',
    number: 1,
    worldId: 'test',
    label: 'Test',
    description: 'fixture',
    targetScore: 150,
    requiredEngagementCount: 2,
    modifiers: [
        { kind: 'iceBlock', category: Categories.Threes },
        { kind: 'flyingMultiplier', category: Categories.Yahtzee, multiplier: 3 },
        { kind: 'doubleCategory', category: Categories.FullHouse },
    ],
};

describe('LevelPuzzleConfig', () => {
    test('exposes level metadata as PuzzleConfig fields', () => {
        const config = new LevelPuzzleConfig(sample);
        expect(config.id).toBe('test-level');
        expect(config.label).toBe('Test');
        expect(config.targetScore).toBe(150);
        expect(config.requiredEngagementCount).toBe(2);
    });

    test('build() returns concrete modifier instances at the authored cells', () => {
        const config = new LevelPuzzleConfig(sample);
        const modifiers = config.build(PUZZLE_TEMPLATE);
        expect(modifiers).toHaveLength(3);
        const ice = modifiers.find(m => m.kind === 'iceBlock');
        expect(ice).toBeInstanceOf(IceBlockModifier);
        expect(ice!.category).toBe(Categories.Threes);
        const fly = modifiers.find(m => m.kind === 'flyingMultiplier') as FlyingMultiplierModifier;
        expect(fly).toBeInstanceOf(FlyingMultiplierModifier);
        expect(fly.category).toBe(Categories.Yahtzee);
        expect(fly.multiplier).toBe(3);
        const dbl = modifiers.find(m => m.kind === 'doubleCategory');
        expect(dbl).toBeInstanceOf(DoubleCategoryModifier);
        expect(dbl!.category).toBe(Categories.FullHouse);
    });

    test('build() is deterministic across calls', () => {
        const config = new LevelPuzzleConfig(sample);
        const a = config.build(PUZZLE_TEMPLATE);
        const b = config.build(PUZZLE_TEMPLATE);
        expect(a.map(m => [m.kind, m.category])).toEqual(b.map(m => [m.kind, m.category]));
    });

    test('all authored LEVELS produce buildable configs without errors', () => {
        for (const level of LEVELS) {
            const config = new LevelPuzzleConfig(level);
            const modifiers = config.build(PUZZLE_TEMPLATE);
            expect(modifiers).toHaveLength(level.modifiers.length);
        }
    });

    test('build() handles all seven modifier kinds', () => {
        const allKinds: LevelDefinition = {
            id: 'allk', number: 1, worldId: 'test', label: 'all',
            targetScore: 0, requiredEngagementCount: 0,
            modifiers: [
                { kind: 'iceBlock', category: Categories.Threes },
                { kind: 'flyingMultiplier', category: Categories.FullHouse },
                { kind: 'doubleCategory', category: Categories.Yahtzee },
                { kind: 'hotPotato', category: Categories.Chance, fuse: 4 },
                { kind: 'multiplierBubble', category: Categories.ThreeOfAKind, scatterCount: 2 },
                { kind: 'loopingMultiplier', category: Categories.LargeStraight, min: 1, max: 4 },
                { kind: 'loopingCategory', category: Categories.SmallStraight,
                  cycle: [Categories.SmallStraight, Categories.LargeStraight, Categories.Chance] },
            ],
        };
        const config = new LevelPuzzleConfig(allKinds);
        const modifiers = config.build(PUZZLE_TEMPLATE);
        expect(modifiers).toHaveLength(7);
        expect(modifiers.find(m => m.kind === 'iceBlock')).toBeInstanceOf(IceBlockModifier);
        expect(modifiers.find(m => m.kind === 'flyingMultiplier')).toBeInstanceOf(FlyingMultiplierModifier);
        expect(modifiers.find(m => m.kind === 'doubleCategory')).toBeInstanceOf(DoubleCategoryModifier);
        expect(modifiers.find(m => m.kind === 'hotPotato')).toBeInstanceOf(HotPotatoModifier);
        expect(modifiers.find(m => m.kind === 'multiplierBubble')).toBeInstanceOf(MultiplierBubbleModifier);
        expect(modifiers.find(m => m.kind === 'loopingMultiplier')).toBeInstanceOf(LoopingMultiplierModifier);
        expect(modifiers.find(m => m.kind === 'loopingCategory')).toBeInstanceOf(LoopingCategoryModifier);
        const hp = modifiers.find(m => m.kind === 'hotPotato') as HotPotatoModifier;
        expect(hp.fuseRemaining).toBe(4);
        const lm = modifiers.find(m => m.kind === 'loopingMultiplier') as LoopingMultiplierModifier;
        expect(lm.value).toBe(1);
        const lc = modifiers.find(m => m.kind === 'loopingCategory') as LoopingCategoryModifier;
        expect(lc.cycle).toHaveLength(3);
        expect(lc.activeCategory).toBe(Categories.SmallStraight);
    });
});
