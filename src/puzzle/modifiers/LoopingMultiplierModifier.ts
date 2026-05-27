import { Categories } from '../../enums/Categories';
import type { ModifierKind, PuzzleEngineCtx, PuzzleModifier } from '../types';

// Stays on its target cell (unlike Flying), but the multiplier value
// triangle-waves between min and max each turn — 1 → 2 → 3 → 2 → 1 → 2 …
// Engages when the player scores on the cell while the multiplier is above 1.
export class LoopingMultiplierModifier implements PuzzleModifier {
    readonly kind: ModifierKind = 'loopingMultiplier';
    category: Categories;
    value: number;
    private readonly minValue: number;
    private readonly maxValue: number;
    private direction: 1 | -1;

    constructor(category: Categories, opts: { min?: number; max?: number; start?: number } = {}) {
        this.category = category;
        this.minValue = opts.min ?? 1;
        this.maxValue = opts.max ?? 3;
        const start = opts.start ?? this.minValue;
        this.value = Math.max(this.minValue, Math.min(this.maxValue, start));
        this.direction = 1;
    }

    transformScore(category: Categories, rawScore: number, ctx?: PuzzleEngineCtx): number {
        if (category !== this.category) return rawScore;
        const final = rawScore * this.value;
        if (ctx && rawScore > 0 && this.value > 1) {
            ctx.emit({
                type: 'loopingMultiplier:applied',
                category: this.category,
                raw: rawScore,
                final,
                multiplier: this.value,
            });
        }
        return final;
    }

    onAfterScore(scored: Categories, value: number, ctx: PuzzleEngineCtx): void {
        // Engage when the player actually banked a boosted score (value > 0
        // AND the multiplier was contributing — i.e., > 1).
        if (scored === this.category && value > 0 && this.value > 1) {
            ctx.markEngaged(this.kind);
        }
    }

    onTurnEnd(ctx: PuzzleEngineCtx): void {
        // Bounce at the rails.
        if (this.value >= this.maxValue) this.direction = -1;
        else if (this.value <= this.minValue) this.direction = 1;
        this.value += this.direction;
        ctx.emit({
            type: 'loopingMultiplier:change',
            category: this.category,
            value: this.value,
            min: this.minValue,
            max: this.maxValue,
            atPeak: this.value === this.maxValue,
        });
    }
}
