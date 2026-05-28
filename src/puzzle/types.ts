import { Categories } from '../enums/Categories';
import type { Die } from '../types/Die';
import type { ScorecardTemplateEntry } from '../config/scorecardTemplates';

// Deterministic RNG function: returns a number in [0, 1). Pass mulberry32-style
// seeded RNGs when reproducibility matters (Daily Puzzle); default Math.random
// elsewhere.
export type RNG = () => number;

export type ModifierKind =
    | 'iceBlock'
    | 'flyingMultiplier'
    | 'doubleCategory'
    | 'hotPotato'
    | 'multiplierBubble'
    | 'loopingMultiplier'
    | 'loopingCategory';

// Lightweight, typed event bus surface. The engine emits these so the UI
// can play cell-anchored animations + sounds without diffing reactive state.
export type EngineEvent =
    | { type: 'iceBlock:melt'; category: Categories }
    | { type: 'flyingMultiplier:relocate'; from: Categories; to: Categories; multiplier: number }
    | { type: 'flyingMultiplier:applied'; category: Categories; raw: number; final: number; multiplier: number }
    | { type: 'hotPotato:armed'; category: Categories; fuse: number }
    | { type: 'hotPotato:tick'; category: Categories; fuseRemaining: number }
    | { type: 'hotPotato:defuse'; category: Categories; scored: boolean }
    | { type: 'hotPotato:expire'; category: Categories }
    | { type: 'multiplierBubble:pop'; from: Categories; targets: Categories[] }
    | { type: 'loopingMultiplier:change'; category: Categories; value: number; min: number; max: number; atPeak: boolean }
    | { type: 'loopingMultiplier:applied'; category: Categories; raw: number; final: number; multiplier: number }
    | { type: 'loopingCategory:cycle'; category: Categories; activeCategory: Categories; index: number; total: number }
    | { type: 'loopingCategory:applied'; category: Categories; raw: number; final: number; active: Categories }
    | { type: 'engine:bonusTurn'; category: Categories }
    | { type: 'engine:goalMet'; kind: 'score' | 'engagement' };

export type EngineEventListener = (event: EngineEvent) => void;

// Hooks are optional — a modifier only implements the ones it cares about.
// Engine fans events out to every modifier in order; modifiers can mutate
// themselves and/or call ctx methods to ask the engine to relocate/remove
// them or queue a bonus turn.
export interface PuzzleModifier {
    kind: ModifierKind;
    category: Categories;

    // Veto a score selection. Used by Ice Blocks to prevent scoring on the
    // frozen category. Return false to block.
    canScore?(category: Categories): boolean;

    // Mutate the raw category score before it's banked. Flying Multiplier
    // multiplies its target category's score. ctx is optional so existing
    // pure transforms keep their old signature.
    transformScore?(category: Categories, rawScore: number, ctx?: PuzzleEngineCtx): number;

    // Fired after a score has been banked (the score passed here is the
    // final value written to the scorecard). Used by Ice Blocks to clear
    // themselves when a neighbor is scored, and by Double Category to
    // queue a bonus turn.
    onAfterScore?(category: Categories, value: number, ctx: PuzzleEngineCtx): void;

    // Fired at the end of the active player's turn (after scoring +
    // bonus-turn handling). Flying Multiplier uses this to relocate.
    onTurnEnd?(ctx: PuzzleEngineCtx): void;
}

export interface PuzzleEngineCtx {
    template: ScorecardTemplateEntry[];
    // Snapshot of the dice for the active scoring call. Only meaningful inside
    // transformScore / onAfterScore — set immediately before those hooks and
    // empty otherwise. Modifiers that need to recompute against a different
    // category (Looping Categories) read this and call useCalculateScore.
    readonly dice: Die[];
    // Categories already filled on the scorecard (any value, including 0).
    scoredCategories(): Set<Categories>;
    // Remove a specific modifier instance.
    removeModifier(modifier: PuzzleModifier): void;
    // Move a modifier to a new category. Engine vets the move (no-op if
    // the target already hosts a same-kind modifier or is already scored).
    relocateModifier(modifier: PuzzleModifier, newCategory: Categories): void;
    // Pick a random unscored category that doesn't already host a modifier
    // of the given kind. Returns null if no eligible category exists.
    pickRandomUnscored(kind: ModifierKind, exclude?: Categories): Categories | null;
    // Queue a bonus turn: the next scoring on `category` will sum into the
    // existing slot value rather than overwriting; the player does not
    // advance after the triggering score.
    requestBonusTurn(category: Categories): void;
    // Mark a modifier kind as "actually engaged" — i.e., the player triggered
    // its effect (ice melted by adjacent score, flying multiplier multiplied
    // a real score, double-category bonus turn completed). Used by the
    // engagement win-rule.
    markEngaged(kind: ModifierKind): void;
    // Forcibly bank a score in a category (selected = true). Used by Hot
    // Potato when the fuse expires — burns the slot at 0. No-op if the
    // engine wasn't given a write callback.
    forceScore(category: Categories, value: number): void;
    // Insert additional modifiers mid-game (Multiplier Bubbles scatters
    // fresh chips when triggered).
    addModifiers(modifiers: PuzzleModifier[]): void;
    // Emit a lifecycle event for the UI (animations + sound). Engine fans
    // out to subscribers registered via PuzzleEngine.on(). Safe to call
    // even with no subscribers — it's a no-op then.
    emit(event: EngineEvent): void;
}

export interface PuzzleConfig {
    id: string;
    label: string;
    description?: string;
    targetScore: number;
    requiredEngagementCount: number;
    // `rng` is optional and defaults to Math.random. Daily Puzzle threads a
    // seeded RNG through here for deterministic placement.
    build(template: ScorecardTemplateEntry[], rng?: RNG): PuzzleModifier[];
}

export type PuzzleResultStatus = 'win' | 'lose';

export interface PuzzleResult {
    status: PuzzleResultStatus;
    totalScore: number;
    targetScore: number;
    scoreMet: boolean;
    requiredEngagementCount: number;
    presentKinds: ModifierKind[];
    engagedKinds: ModifierKind[];
    engagementMet: boolean;
}
