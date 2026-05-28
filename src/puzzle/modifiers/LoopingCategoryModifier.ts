import { Categories } from '../../enums/Categories';
import { useCalculateScore } from '../../utils/CalculateScore';
import type { ModifierKind, PuzzleEngineCtx, PuzzleModifier } from '../types';

// The "active scoring category" cycles through an author-provided list each
// turn end. When the player scores the slot, the score is RECOMPUTED using
// whichever category is currently active — so a slot sitting on ThreeOfAKind
// can score as Yahtzee on one turn and Chance on the next.
//
// Engagement: counts only when the player banks a positive score AND the
// active category is something other than the slot's home category (scoring
// at the default doesn't feel like "using" the modifier).
export class LoopingCategoryModifier implements PuzzleModifier {
    readonly kind: ModifierKind = 'loopingCategory';
    category: Categories;
    readonly cycle: Categories[];
    currentIndex: number;

    constructor(slotCategory: Categories, opts: { cycle: Categories[]; start?: number }) {
        if (!opts.cycle || opts.cycle.length === 0) {
            throw new Error('LoopingCategoryModifier requires a non-empty cycle');
        }
        this.category = slotCategory;
        this.cycle = [...opts.cycle];
        const start = opts.start ?? 0;
        this.currentIndex = ((start % this.cycle.length) + this.cycle.length) % this.cycle.length;
    }

    get activeCategory(): Categories {
        return this.cycle[this.currentIndex];
    }

    transformScore(category: Categories, rawScore: number, ctx?: PuzzleEngineCtx): number {
        if (category !== this.category) return rawScore;
        const active = this.activeCategory;
        // If the cycle is currently sitting at the slot's home category, the
        // raw passes through unchanged. Subsequent modifiers in the chain
        // still apply normally.
        if (active === this.category) return rawScore;
        // Recompute against the live dice using the active scoring rule. If
        // dice aren't available (engine called without a snapshot), fall back
        // to the raw — better to give a fair score than zero.
        const dice = ctx?.dice ?? [];
        if (dice.length === 0) return rawScore;
        const final = useCalculateScore(active, dice);
        if (ctx) {
            ctx.emit({
                type: 'loopingCategory:applied',
                category: this.category,
                raw: rawScore,
                final,
                active,
            });
        }
        return final;
    }

    onAfterScore(scored: Categories, value: number, ctx: PuzzleEngineCtx): void {
        if (scored !== this.category) return;
        // Only engage when the substitution was actually meaningful: positive
        // banked score AND the active category was NOT the slot's home.
        if (value > 0 && this.activeCategory !== this.category) {
            ctx.markEngaged(this.kind);
        }
    }

    onTurnEnd(ctx: PuzzleEngineCtx): void {
        this.currentIndex = (this.currentIndex + 1) % this.cycle.length;
        ctx.emit({
            type: 'loopingCategory:cycle',
            category: this.category,
            activeCategory: this.activeCategory,
            index: this.currentIndex,
            total: this.cycle.length,
        });
    }

    // Used by the Phase 4 Re-Cycle consumable to advance the cycle on demand.
    // Identical semantics to onTurnEnd minus the engine ctx dependency at the
    // call site; emits the same event via the passed ctx.
    skipToNext(ctx: PuzzleEngineCtx): void {
        this.onTurnEnd(ctx);
    }
}
