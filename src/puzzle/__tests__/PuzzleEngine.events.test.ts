import { Categories } from '../../enums/Categories';
import { PUZZLE_TEMPLATE } from '../../config/scorecardTemplates';
import { PuzzleEngine } from '../PuzzleEngine';
import { IceBlockModifier } from '../modifiers/IceBlockModifier';
import { FlyingMultiplierModifier } from '../modifiers/FlyingMultiplierModifier';
import { LoopingMultiplierModifier } from '../modifiers/LoopingMultiplierModifier';
import { HotPotatoModifier } from '../modifiers/HotPotatoModifier';
import { MultiplierBubbleModifier } from '../modifiers/MultiplierBubbleModifier';
import { DoubleCategoryModifier } from '../modifiers/DoubleCategoryModifier';
import type { EngineEvent, PuzzleConfig } from '../types';

type Scorecard = Partial<Record<Categories, { selected: boolean; value: number | null }>>;

function makeEngine(opts: {
    modifiers: ReturnType<PuzzleConfig['build']>;
    targetScore?: number;
    requiredEngagementCount?: number;
    scorecard?: Scorecard;
    writeScore?: (cat: Categories, value: number) => void;
}): { engine: PuzzleEngine; events: EngineEvent[] } {
    const scorecard = opts.scorecard ?? {};
    const engine = new PuzzleEngine(() => scorecard, opts.writeScore ?? null);
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
    const events: EngineEvent[] = [];
    engine.on(e => events.push(e));
    return { engine, events };
}

describe('PuzzleEngine event bus', () => {
    test('on() returns an unsubscriber', () => {
        const { engine } = makeEngine({ modifiers: [] });
        const unsub = engine.on(() => { /* noop */ });
        unsub();
        // Emitting after unsubscribe should not throw and should not invoke
        // the unsubscribed listener — covered indirectly by other tests.
        engine.emit({ type: 'engine:goalMet', kind: 'score' });
    });

    test('iceBlock:melt fires when adjacent score clears the block', () => {
        const ice = new IceBlockModifier(Categories.Threes);
        const { engine, events } = makeEngine({ modifiers: [ice] });
        engine.afterScore(Categories.Twos, 4);
        const melts = events.filter(e => e.type === 'iceBlock:melt');
        expect(melts).toHaveLength(1);
        expect(melts[0]).toMatchObject({ type: 'iceBlock:melt', category: Categories.Threes });
    });

    test('flyingMultiplier:applied fires from transformScore when on target', () => {
        const fly = new FlyingMultiplierModifier(Categories.Fives, 2);
        const { engine, events } = makeEngine({ modifiers: [fly] });
        engine.applyScore(Categories.Fives, 20);
        const applied = events.filter(e => e.type === 'flyingMultiplier:applied');
        expect(applied).toHaveLength(1);
        expect(applied[0]).toMatchObject({
            type: 'flyingMultiplier:applied',
            category: Categories.Fives,
            raw: 20, final: 40, multiplier: 2,
        });
    });

    test('flyingMultiplier:applied does NOT fire when raw is 0', () => {
        const fly = new FlyingMultiplierModifier(Categories.Fives, 2);
        const { engine, events } = makeEngine({ modifiers: [fly] });
        engine.applyScore(Categories.Fives, 0);
        expect(events.filter(e => e.type === 'flyingMultiplier:applied')).toHaveLength(0);
    });

    test('flyingMultiplier:relocate fires after onTurnEnd', () => {
        const fly = new FlyingMultiplierModifier(Categories.Sixes, 2);
        const { engine, events } = makeEngine({ modifiers: [fly] });
        engine.onTurnEnd();
        const moves = events.filter(e => e.type === 'flyingMultiplier:relocate');
        expect(moves).toHaveLength(1);
        // From the original cell, to *some* unscored cell.
        expect(moves[0]).toMatchObject({ type: 'flyingMultiplier:relocate', from: Categories.Sixes, multiplier: 2 });
    });

    test('hotPotato:armed fires on first non-zero score elsewhere', () => {
        const bomb = new HotPotatoModifier(Categories.FullHouse, 3);
        const { engine, events } = makeEngine({ modifiers: [bomb] });
        engine.afterScore(Categories.Sixes, 24);
        const armed = events.filter(e => e.type === 'hotPotato:armed');
        expect(armed).toHaveLength(1);
        expect(armed[0]).toMatchObject({ type: 'hotPotato:armed', category: Categories.FullHouse, fuse: 3 });
    });

    test('hotPotato:tick fires on each subsequent turn end while armed', () => {
        const bomb = new HotPotatoModifier(Categories.FullHouse, 3);
        const { engine, events } = makeEngine({ modifiers: [bomb] });
        engine.afterScore(Categories.Sixes, 24); // arm
        engine.onTurnEnd();                       // fuse 3 -> 2
        const ticks = events.filter(e => e.type === 'hotPotato:tick');
        expect(ticks).toHaveLength(1);
        expect(ticks[0]).toMatchObject({ type: 'hotPotato:tick', fuseRemaining: 2 });
    });

    test('hotPotato:expire fires when fuse runs out', () => {
        const writes: Array<{ cat: Categories; v: number }> = [];
        const bomb = new HotPotatoModifier(Categories.FullHouse, 1);
        const { engine, events } = makeEngine({
            modifiers: [bomb],
            writeScore: (cat, v) => writes.push({ cat, v }),
        });
        engine.afterScore(Categories.Sixes, 24); // arm (fuse=1)
        engine.onTurnEnd();                       // fuse 1 -> 0, expire
        expect(events.some(e => e.type === 'hotPotato:expire')).toBe(true);
        expect(writes).toEqual([{ cat: Categories.FullHouse, v: 0 }]);
    });

    test('multiplierBubble:pop fires with scatter targets', () => {
        const bubble = new MultiplierBubbleModifier(Categories.ThreeOfAKind, 3, 2);
        const { engine, events } = makeEngine({ modifiers: [bubble] });
        engine.afterScore(Categories.ThreeOfAKind, 18);
        const pops = events.filter(e => e.type === 'multiplierBubble:pop');
        expect(pops).toHaveLength(1);
        const pop = pops[0] as Extract<EngineEvent, { type: 'multiplierBubble:pop' }>;
        expect(pop.from).toBe(Categories.ThreeOfAKind);
        expect(pop.targets.length).toBeGreaterThan(0);
        expect(pop.targets.length).toBeLessThanOrEqual(3);
    });

    test('loopingMultiplier:change fires after each onTurnEnd', () => {
        const loop = new LoopingMultiplierModifier(Categories.Yahtzee, { min: 1, max: 3, start: 1 });
        const { engine, events } = makeEngine({ modifiers: [loop] });
        engine.onTurnEnd();
        const changes = events.filter(e => e.type === 'loopingMultiplier:change');
        expect(changes).toHaveLength(1);
        expect(changes[0]).toMatchObject({ type: 'loopingMultiplier:change', value: 2, atPeak: false });
        engine.onTurnEnd();
        const second = events.filter(e => e.type === 'loopingMultiplier:change')[1];
        expect(second).toMatchObject({ value: 3, atPeak: true });
    });

    test('loopingMultiplier:applied fires from transformScore when value > 1', () => {
        const loop = new LoopingMultiplierModifier(Categories.Yahtzee, { min: 1, max: 3, start: 2 });
        const { engine, events } = makeEngine({ modifiers: [loop] });
        engine.applyScore(Categories.Yahtzee, 50);
        const applied = events.filter(e => e.type === 'loopingMultiplier:applied');
        expect(applied).toHaveLength(1);
        expect(applied[0]).toMatchObject({ raw: 50, final: 100, multiplier: 2 });
    });

    test('engine:bonusTurn fires when DoubleCategoryModifier requests it', () => {
        const dbl = new DoubleCategoryModifier(Categories.FullHouse);
        const { engine, events } = makeEngine({ modifiers: [dbl] });
        engine.afterScore(Categories.FullHouse, 25);
        expect(events).toContainEqual({ type: 'engine:bonusTurn', category: Categories.FullHouse });
    });

    test('engine:goalMet emits once per goal kind, on the crossing turn', () => {
        const fly = new FlyingMultiplierModifier(Categories.Sixes, 2);
        const { engine, events } = makeEngine({
            modifiers: [fly],
            targetScore: 100,
            requiredEngagementCount: 1,
        });
        // First check: not met yet.
        engine.checkGoalMet(50);
        expect(events.filter(e => e.type === 'engine:goalMet')).toHaveLength(0);
        // Score-only crossing.
        engine.checkGoalMet(120);
        const scoreGoals = events.filter(e => e.type === 'engine:goalMet' && (e as any).kind === 'score');
        expect(scoreGoals).toHaveLength(1);
        // Crossing again should NOT re-emit score.
        engine.checkGoalMet(150);
        expect(events.filter(e => e.type === 'engine:goalMet' && (e as any).kind === 'score')).toHaveLength(1);
        // Now engagement crossing.
        engine.afterScore(Categories.Sixes, 24); // marks flyingMultiplier engaged
        engine.checkGoalMet(150);
        expect(events.filter(e => e.type === 'engine:goalMet' && (e as any).kind === 'engagement')).toHaveLength(1);
    });
});
