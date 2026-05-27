import { Categories } from '../../enums/Categories';
import { PUZZLE_TEMPLATE } from '../../config/scorecardTemplates';
import { PuzzleEngine } from '../PuzzleEngine';
import { IceBlockModifier } from '../modifiers/IceBlockModifier';
import { LevelPuzzleConfig } from '../configs/LevelPuzzleConfig';
import type { LevelDefinition } from '../levels/types';

const sharedLevel: LevelDefinition = {
    id: 'shared', number: 1, worldId: 'test', label: 'shared',
    targetScore: 100, requiredEngagementCount: 1,
    modifiers: [
        { kind: 'iceBlock', category: Categories.Threes },
        { kind: 'flyingMultiplier', category: Categories.Yahtzee },
    ],
};

describe('per-player puzzle engines (vs-AI parity)', () => {
    test('two engines from the same config have independent modifier state', () => {
        const config = new LevelPuzzleConfig(sharedLevel);
        const scorecards = [
            {} as Partial<Record<Categories, { selected: boolean; value: number | null }>>,
            {} as Partial<Record<Categories, { selected: boolean; value: number | null }>>,
        ];
        const engines = scorecards.map(sc => {
            const e = new PuzzleEngine(() => sc);
            e.initFromConfig(config, PUZZLE_TEMPLATE);
            return e;
        });

        // Player 0 melts their ice block.
        engines[0].afterScore(Categories.Twos, 4);
        expect(engines[0].getModifierAt(Categories.Threes)).toBeUndefined();
        // Player 1's ice block is untouched.
        expect(engines[1].getModifierAt(Categories.Threes)).toBeInstanceOf(IceBlockModifier);
    });

    test('engagement tracking is per-engine', () => {
        const config = new LevelPuzzleConfig(sharedLevel);
        const a = new PuzzleEngine(() => ({}));
        const b = new PuzzleEngine(() => ({}));
        a.initFromConfig(config, PUZZLE_TEMPLATE);
        b.initFromConfig(config, PUZZLE_TEMPLATE);
        a.afterScore(Categories.Twos, 4); // melts → engages iceBlock on A
        expect(a.isKindEngaged('iceBlock')).toBe(true);
        expect(b.isKindEngaged('iceBlock')).toBe(false);
    });

    test('Flying Multiplier locations diverge after independent turn ends', () => {
        const config = new LevelPuzzleConfig(sharedLevel);
        const a = new PuzzleEngine(() => ({}));
        const b = new PuzzleEngine(() => ({}));
        a.initFromConfig(config, PUZZLE_TEMPLATE);
        b.initFromConfig(config, PUZZLE_TEMPLATE);
        const startA = a.getModifiersOfKind('flyingMultiplier')[0].category;
        const startB = b.getModifiersOfKind('flyingMultiplier')[0].category;
        expect(startA).toBe(startB); // same starting cell from the same config
        a.onTurnEnd(); // only A's chip moves
        const afterA = a.getModifiersOfKind('flyingMultiplier')[0].category;
        const afterB = b.getModifiersOfKind('flyingMultiplier')[0].category;
        expect(afterA).not.toBe(startA);
        expect(afterB).toBe(startB);
    });
});
