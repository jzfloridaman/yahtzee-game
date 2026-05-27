import { Categories } from '../../enums/Categories';
import type { ModifierKind, PuzzleEngineCtx, PuzzleModifier } from '../types';

// First score on the target category grants a bonus turn (3 rolls + holds)
// to score the same category a second time. Both scores sum into the slot.
// The modifier removes itself after the second score lands.
export class DoubleCategoryModifier implements PuzzleModifier {
    readonly kind: ModifierKind = 'doubleCategory';
    category: Categories;
    private bonusGranted = false;

    constructor(category: Categories) {
        this.category = category;
    }

    onAfterScore(scored: Categories, _value: number, ctx: PuzzleEngineCtx): void {
        if (scored !== this.category) return;
        if (!this.bonusGranted) {
            this.bonusGranted = true;
            ctx.requestBonusTurn(this.category);
        } else {
            // Engagement: bonus turn was completed (second score landed).
            ctx.markEngaged(this.kind);
            ctx.removeModifier(this);
        }
    }
}
