import { Categories } from '../../enums/Categories';
import type { ModifierKind, PuzzleEngineCtx, PuzzleModifier } from '../types';

// Single-player adaptation of the Dice World "Hot Potato" mechanic.
// Placed dormant at game start; arms itself once the player banks their
// first non-zero score in any other category. While armed, a fuse counts
// down at the end of every turn. Score >0 on the bomb cell to defuse +
// engage; score 0 to defuse without engagement; let the fuse expire and
// the cell is force-banked at 0.
export class HotPotatoModifier implements PuzzleModifier {
    readonly kind: ModifierKind = 'hotPotato';
    category: Categories;
    fuseRemaining: number;
    activated: boolean = false;
    private readonly initialFuse: number;

    constructor(category: Categories, fuse: number = 3) {
        this.category = category;
        this.initialFuse = fuse;
        this.fuseRemaining = fuse;
    }

    onAfterScore(scored: Categories, value: number, ctx: PuzzleEngineCtx): void {
        if (!this.activated) {
            if (scored === this.category) {
                // Scored the bomb pre-activation — clears it but no engagement,
                // and no first-strike to arm the others.
                ctx.emit({ type: 'hotPotato:defuse', category: this.category, scored: value > 0 });
                ctx.removeModifier(this);
                return;
            }
            if (value > 0) {
                this.activated = true;
                this.fuseRemaining = this.initialFuse;
                ctx.emit({ type: 'hotPotato:armed', category: this.category, fuse: this.fuseRemaining });
            }
            return;
        }
        if (scored === this.category) {
            if (value > 0) ctx.markEngaged(this.kind);
            ctx.emit({ type: 'hotPotato:defuse', category: this.category, scored: value > 0 });
            ctx.removeModifier(this);
        }
    }

    onTurnEnd(ctx: PuzzleEngineCtx): void {
        if (!this.activated) return;
        this.fuseRemaining--;
        if (this.fuseRemaining <= 0) {
            // Fuse expired — burn the slot at 0 and remove the modifier.
            ctx.emit({ type: 'hotPotato:expire', category: this.category });
            ctx.forceScore(this.category, 0);
            ctx.removeModifier(this);
        } else {
            ctx.emit({ type: 'hotPotato:tick', category: this.category, fuseRemaining: this.fuseRemaining });
        }
    }
}
