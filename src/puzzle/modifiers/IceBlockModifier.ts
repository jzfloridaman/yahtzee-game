import { Categories } from '../../enums/Categories';
import type { ModifierKind, PuzzleEngineCtx, PuzzleModifier } from '../types';

// Freezes its target category until a score >0 is banked on the category
// immediately above or below it in the active template's row order.
export class IceBlockModifier implements PuzzleModifier {
    readonly kind: ModifierKind = 'iceBlock';
    category: Categories;

    constructor(category: Categories) {
        this.category = category;
    }

    canScore(category: Categories): boolean {
        return category !== this.category;
    }

    onAfterScore(scored: Categories, value: number, ctx: PuzzleEngineCtx): void {
        if (value <= 0) return;
        const order = ctx.template.map(entry => entry.category);
        const selfIndex = order.indexOf(this.category);
        if (selfIndex === -1) return;
        const above = selfIndex > 0 ? order[selfIndex - 1] : null;
        const below = selfIndex < order.length - 1 ? order[selfIndex + 1] : null;
        if (scored === above || scored === below) {
            ctx.markEngaged(this.kind);
            ctx.removeModifier(this);
        }
    }
}
