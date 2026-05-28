import type { ScorecardTemplateEntry } from '../../config/scorecardTemplates';
import type { PuzzleConfig, PuzzleModifier } from '../types';
import type { LevelDefinition } from '../levels/types';
import { IceBlockModifier } from '../modifiers/IceBlockModifier';
import { FlyingMultiplierModifier } from '../modifiers/FlyingMultiplierModifier';
import { DoubleCategoryModifier } from '../modifiers/DoubleCategoryModifier';
import { HotPotatoModifier } from '../modifiers/HotPotatoModifier';
import { MultiplierBubbleModifier } from '../modifiers/MultiplierBubbleModifier';
import { LoopingMultiplierModifier } from '../modifiers/LoopingMultiplierModifier';
import { LoopingCategoryModifier } from '../modifiers/LoopingCategoryModifier';

// PuzzleConfig adapter for hand-authored Adventure levels. Modifier types
// and positions are fixed (no randomness in build()).
export class LevelPuzzleConfig implements PuzzleConfig {
    readonly id: string;
    readonly label: string;
    readonly description: string;
    readonly targetScore: number;
    readonly requiredEngagementCount: number;
    readonly level: LevelDefinition;

    constructor(level: LevelDefinition) {
        this.level = level;
        this.id = level.id;
        this.label = level.label;
        this.description = level.description ?? '';
        this.targetScore = level.targetScore;
        this.requiredEngagementCount = level.requiredEngagementCount;
    }

    build(_template: ScorecardTemplateEntry[]): PuzzleModifier[] {
        return this.level.modifiers.map(spec => {
            switch (spec.kind) {
                case 'iceBlock':
                    return new IceBlockModifier(spec.category);
                case 'flyingMultiplier':
                    return new FlyingMultiplierModifier(spec.category, spec.multiplier ?? 2);
                case 'doubleCategory':
                    return new DoubleCategoryModifier(spec.category);
                case 'hotPotato':
                    return new HotPotatoModifier(spec.category, spec.fuse ?? 3);
                case 'multiplierBubble':
                    return new MultiplierBubbleModifier(
                        spec.category,
                        spec.scatterCount ?? 3,
                        spec.scatterMultiplier ?? 2,
                    );
                case 'loopingMultiplier':
                    return new LoopingMultiplierModifier(spec.category, {
                        min: spec.min,
                        max: spec.max,
                        start: spec.start,
                    });
                case 'loopingCategory':
                    return new LoopingCategoryModifier(spec.category, {
                        cycle: spec.cycle,
                        start: spec.start,
                    });
            }
        });
    }
}
