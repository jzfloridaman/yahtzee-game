import { Categories } from '../../enums/Categories';
import type { ModifierKind, PuzzleEngineCtx, PuzzleModifier } from '../types';

// Multiplies the raw score by `multiplier` when the player scores in the
// category the chip currently sits on. Relocates to a random unscored
// category at the end of every turn.
export class FlyingMultiplierModifier implements PuzzleModifier {
    readonly kind: ModifierKind = 'flyingMultiplier';
    category: Categories;
    readonly multiplier: number;

    constructor(category: Categories, multiplier: number = 2) {
        this.category = category;
        this.multiplier = multiplier;
    }

    transformScore(category: Categories, rawScore: number, ctx?: PuzzleEngineCtx): number {
        if (category !== this.category) return rawScore;
        const final = rawScore * this.multiplier;
        // Only emit when the multiplier actually changed the score — zero
        // raws still report 0 → 0 which isn't worth animating.
        if (ctx && rawScore > 0 && this.multiplier > 1) {
            ctx.emit({
                type: 'flyingMultiplier:applied',
                category: this.category,
                raw: rawScore,
                final,
                multiplier: this.multiplier,
            });
        }
        return final;
    }

    onAfterScore(scored: Categories, value: number, ctx: PuzzleEngineCtx): void {
        // Engagement: count only when the player actually got the boost —
        // they scored on the cell the chip sits on and the boost was non-zero.
        if (scored === this.category && value > 0) {
            ctx.markEngaged(this.kind);
        }
    }

    onTurnEnd(ctx: PuzzleEngineCtx): void {
        const from = this.category;
        const next = ctx.pickRandomUnscored(this.kind, this.category);
        if (next) {
            ctx.relocateModifier(this, next);
            ctx.emit({
                type: 'flyingMultiplier:relocate',
                from,
                to: next,
                multiplier: this.multiplier,
            });
        }
    }
}
