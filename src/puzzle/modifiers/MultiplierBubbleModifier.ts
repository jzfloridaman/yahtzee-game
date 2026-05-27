import { Categories } from '../../enums/Categories';
import type { ModifierKind, PuzzleEngineCtx, PuzzleModifier } from '../types';
import { FlyingMultiplierModifier } from './FlyingMultiplierModifier';

// Scoring on a bubble cell pops the bubble and scatters fresh flying
// multipliers onto random unscored categories. Engagement fires when the
// scatter actually happens (we placed at least one chip).
export class MultiplierBubbleModifier implements PuzzleModifier {
    readonly kind: ModifierKind = 'multiplierBubble';
    category: Categories;
    readonly scatterCount: number;
    readonly scatterMultiplier: number;

    constructor(category: Categories, scatterCount: number = 3, scatterMultiplier: number = 2) {
        this.category = category;
        this.scatterCount = scatterCount;
        this.scatterMultiplier = scatterMultiplier;
    }

    onAfterScore(scored: Categories, _value: number, ctx: PuzzleEngineCtx): void {
        if (scored !== this.category) return;

        const placed: FlyingMultiplierModifier[] = [];
        // Take a fresh pick each iteration so we don't collide with chips
        // already placed in this same scatter. Exclude the bubble's own
        // cell explicitly so we never scatter onto it, even if the
        // scorecard hasn't been written-through to the engine's view yet.
        for (let i = 0; i < this.scatterCount; i++) {
            const cell = ctx.pickRandomUnscored('flyingMultiplier', this.category);
            if (!cell) break;
            const chip = new FlyingMultiplierModifier(cell, this.scatterMultiplier);
            placed.push(chip);
            // Register one at a time so the next pick sees this chip's slot
            // as taken.
            ctx.addModifiers([chip]);
        }

        if (placed.length > 0) {
            ctx.markEngaged(this.kind);
        }
        ctx.removeModifier(this);
    }
}
