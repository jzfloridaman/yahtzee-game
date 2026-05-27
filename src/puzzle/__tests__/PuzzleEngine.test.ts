import { Categories } from '../../enums/Categories';
import { PUZZLE_TEMPLATE } from '../../config/scorecardTemplates';
import { PuzzleEngine } from '../PuzzleEngine';
import { IceBlockModifier } from '../modifiers/IceBlockModifier';
import { FlyingMultiplierModifier } from '../modifiers/FlyingMultiplierModifier';
import { DoubleCategoryModifier } from '../modifiers/DoubleCategoryModifier';
import type { PuzzleConfig } from '../types';

type Scorecard = Partial<Record<Categories, { selected: boolean; value: number | null }>>;

function makeEngine(opts: {
    modifiers: ReturnType<PuzzleConfig['build']>;
    targetScore?: number;
    requiredEngagementCount?: number;
    scorecard?: Scorecard;
}): PuzzleEngine {
    const scorecard = opts.scorecard ?? {};
    const engine = new PuzzleEngine(() => scorecard);
    engine.initFromConfig(
        {
            id: 'test',
            label: 'test',
            targetScore: opts.targetScore ?? 0,
            requiredEngagementCount: opts.requiredEngagementCount ?? 0,
            build: () => opts.modifiers,
        },
        PUZZLE_TEMPLATE,
    );
    return engine;
}

describe('PuzzleEngine engagement tracking', () => {
    test('ice block marks iceBlock engaged when cleared by adjacent score', () => {
        const ice = new IceBlockModifier(Categories.Threes);
        const engine = makeEngine({ modifiers: [ice] });
        engine.afterScore(Categories.Twos, 4);
        expect(engine.isKindEngaged('iceBlock')).toBe(true);
    });

    test('ice block does NOT mark engaged when an unrelated category is scored', () => {
        const ice = new IceBlockModifier(Categories.Threes);
        const engine = makeEngine({ modifiers: [ice] });
        engine.afterScore(Categories.Sixes, 24);
        expect(engine.isKindEngaged('iceBlock')).toBe(false);
    });

    test('flying multiplier marks engaged only when its own category is scored', () => {
        const fly = new FlyingMultiplierModifier(Categories.Fives, 2);
        const engine = makeEngine({ modifiers: [fly] });
        engine.afterScore(Categories.Sixes, 24);
        expect(engine.isKindEngaged('flyingMultiplier')).toBe(false);
        engine.afterScore(Categories.Fives, 20);
        expect(engine.isKindEngaged('flyingMultiplier')).toBe(true);
    });

    test('flying multiplier does NOT mark engaged when scored at 0', () => {
        const fly = new FlyingMultiplierModifier(Categories.Fives, 2);
        const engine = makeEngine({ modifiers: [fly] });
        engine.afterScore(Categories.Fives, 0);
        expect(engine.isKindEngaged('flyingMultiplier')).toBe(false);
    });

    test('double category marks engaged only after the bonus second score', () => {
        const dbl = new DoubleCategoryModifier(Categories.FullHouse);
        const engine = makeEngine({ modifiers: [dbl] });
        engine.afterScore(Categories.FullHouse, 25);
        expect(engine.isKindEngaged('doubleCategory')).toBe(false);
        engine.consumePendingBonusCategory();
        engine.afterScore(Categories.FullHouse, 25);
        expect(engine.isKindEngaged('doubleCategory')).toBe(true);
    });
});

describe('PuzzleEngine.getResult', () => {
    test('win requires both target score and engagement', () => {
        const engine = makeEngine({
            modifiers: [
                new IceBlockModifier(Categories.Threes),
                new FlyingMultiplierModifier(Categories.Fives, 2),
            ],
            targetScore: 100,
            requiredEngagementCount: 2,
        });
        // Engage both kinds.
        engine.afterScore(Categories.Twos, 4);  // melts ice → iceBlock engaged
        engine.afterScore(Categories.Fives, 20); // multiplier engaged
        const win = engine.getResult(150);
        expect(win.status).toBe('win');
        expect(win.scoreMet).toBe(true);
        expect(win.engagementMet).toBe(true);
    });

    test('lose if score met but engagement not', () => {
        const engine = makeEngine({
            modifiers: [
                new IceBlockModifier(Categories.Threes),
                new FlyingMultiplierModifier(Categories.Fives, 2),
            ],
            targetScore: 100,
            requiredEngagementCount: 2,
        });
        engine.afterScore(Categories.Twos, 4); // only one engagement
        const result = engine.getResult(150);
        expect(result.status).toBe('lose');
        expect(result.scoreMet).toBe(true);
        expect(result.engagementMet).toBe(false);
    });

    test('lose if engagement met but score not', () => {
        const engine = makeEngine({
            modifiers: [new IceBlockModifier(Categories.Threes)],
            targetScore: 100,
            requiredEngagementCount: 1,
        });
        engine.afterScore(Categories.Twos, 4); // engagement met
        const result = engine.getResult(80);
        expect(result.status).toBe('lose');
        expect(result.scoreMet).toBe(false);
        expect(result.engagementMet).toBe(true);
    });

    test('engagement requirement clamps to kinds actually present', () => {
        const engine = makeEngine({
            modifiers: [new IceBlockModifier(Categories.Threes)],
            targetScore: 0,
            requiredEngagementCount: 3, // asks for 3 but only 1 kind present
        });
        expect(engine.getRequiredEngagementCount()).toBe(1);
        engine.afterScore(Categories.Twos, 4);
        expect(engine.getResult(0).engagementMet).toBe(true);
    });
});
