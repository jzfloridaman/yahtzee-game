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

    transformScore(category: Categories, rawScore: number): number {
        return category === this.category ? rawScore * this.multiplier : rawScore;
    }

    onAfterScore(scored: Categories, value: number, ctx: PuzzleEngineCtx): void {
        // Engagement: count only when the player actually got the boost —
        // they scored on the cell the chip sits on and the boost was non-zero.
        if (scored === this.category && value > 0) {
            ctx.markEngaged(this.kind);
        }
    }

    onTurnEnd(ctx: PuzzleEngineCtx): void {
        const next = ctx.pickRandomUnscored(this.kind, this.category);
        if (next) {
            ctx.relocateModifier(this, next);
        }
    }
}
