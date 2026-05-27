import { Categories } from '../../../enums/Categories';
import { PUZZLE_TEMPLATE } from '../../../config/scorecardTemplates';
import { PuzzleEngine } from '../../PuzzleEngine';
import { HotPotatoModifier } from '../HotPotatoModifier';
import type { PuzzleConfig } from '../../types';

type Scorecard = Partial<Record<Categories, { selected: boolean; value: number | null }>>;
type WriteCall = [Categories, number];

function makeEngine(modifier: HotPotatoModifier, opts: { scorecard?: Scorecard } = {}) {
    const scorecard = opts.scorecard ?? {};
    const writes: WriteCall[] = [];
    const engine = new PuzzleEngine(
        () => scorecard,
        (cat, val) => {
            writes.push([cat, val]);
            scorecard[cat] = { selected: true, value: val };
        },
    );
    const config: PuzzleConfig = {
        id: 'test', label: 'test', targetScore: 0, requiredEngagementCount: 0,
        build: () => [modifier],
    };
    engine.initFromConfig(config, PUZZLE_TEMPLATE);
    return { engine, writes };
}

describe('HotPotatoModifier', () => {
    test('starts dormant and arms after the first non-zero score elsewhere', () => {
        const mod = new HotPotatoModifier(Categories.FullHouse, 3);
        const { engine } = makeEngine(mod);
        expect(mod.activated).toBe(false);
        engine.afterScore(Categories.Twos, 4);
        expect(mod.activated).toBe(true);
        expect(mod.fuseRemaining).toBe(3);
    });

    test('does not arm on a zero-score elsewhere', () => {
        const mod = new HotPotatoModifier(Categories.FullHouse, 3);
        const { engine } = makeEngine(mod);
        engine.afterScore(Categories.Ones, 0);
        expect(mod.activated).toBe(false);
    });

    test('scoring the bomb cell pre-activation clears it without engagement', () => {
        const mod = new HotPotatoModifier(Categories.FullHouse, 3);
        const { engine } = makeEngine(mod);
        engine.afterScore(Categories.FullHouse, 25);
        expect(engine.getModifierAt(Categories.FullHouse)).toBeUndefined();
        expect(engine.isKindEngaged('hotPotato')).toBe(false);
    });

    test('defusing the armed bomb with a positive score engages and removes', () => {
        const mod = new HotPotatoModifier(Categories.FullHouse, 3);
        const { engine } = makeEngine(mod);
        engine.afterScore(Categories.Twos, 4); // arm
        engine.afterScore(Categories.FullHouse, 25); // defuse
        expect(engine.getModifierAt(Categories.FullHouse)).toBeUndefined();
        expect(engine.isKindEngaged('hotPotato')).toBe(true);
    });

    test('zero score on the armed bomb defuses without engagement', () => {
        const mod = new HotPotatoModifier(Categories.FullHouse, 3);
        const { engine } = makeEngine(mod);
        engine.afterScore(Categories.Twos, 4); // arm
        engine.afterScore(Categories.FullHouse, 0);
        expect(engine.getModifierAt(Categories.FullHouse)).toBeUndefined();
        expect(engine.isKindEngaged('hotPotato')).toBe(false);
    });

    test('fuse expires after the configured number of turn ends', () => {
        const mod = new HotPotatoModifier(Categories.FullHouse, 2);
        const { engine, writes } = makeEngine(mod);
        engine.afterScore(Categories.Twos, 4); // arm, fuse=2
        engine.onTurnEnd(); // fuse=1
        engine.onTurnEnd(); // fuse=0 -> explode
        expect(engine.getModifierAt(Categories.FullHouse)).toBeUndefined();
        expect(writes).toEqual([[Categories.FullHouse, 0]]);
        expect(engine.isKindEngaged('hotPotato')).toBe(false);
    });

    test('turn ends before arming do not tick the fuse', () => {
        const mod = new HotPotatoModifier(Categories.FullHouse, 3);
        const { engine, writes } = makeEngine(mod);
        engine.onTurnEnd();
        engine.onTurnEnd();
        engine.onTurnEnd();
        expect(mod.activated).toBe(false);
        expect(mod.fuseRemaining).toBe(3);
        expect(writes).toEqual([]);
    });
});
