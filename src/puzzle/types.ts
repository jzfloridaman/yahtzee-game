import { Categories } from '../enums/Categories';
import type { ScorecardTemplateEntry } from '../config/scorecardTemplates';

export type ModifierKind =
    | 'iceBlock'
    | 'flyingMultiplier'
    | 'doubleCategory'
    | 'hotPotato'
    | 'multiplierBubble'
    | 'loopingMultiplier';

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
    // multiplies its target category's score.
    transformScore?(category: Categories, rawScore: number): number;

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
}

export interface PuzzleConfig {
    id: string;
    label: string;
    description?: string;
    targetScore: number;
    requiredEngagementCount: number;
    build(template: ScorecardTemplateEntry[]): PuzzleModifier[];
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
