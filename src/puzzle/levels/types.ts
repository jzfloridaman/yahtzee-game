import type { Categories } from '../../enums/Categories';

// Modifier placements are authored per-cell rather than randomly placed,
// so a given level always presents the same puzzle.
export type LevelModifierSpec =
    | { kind: 'iceBlock'; category: Categories }
    | { kind: 'flyingMultiplier'; category: Categories; multiplier?: number }
    | { kind: 'doubleCategory'; category: Categories }
    | { kind: 'hotPotato'; category: Categories; fuse?: number }
    | { kind: 'multiplierBubble'; category: Categories; scatterCount?: number; scatterMultiplier?: number }
    | { kind: 'loopingMultiplier'; category: Categories; min?: number; max?: number; start?: number };

export interface LevelDefinition {
    id: string;          // stable persistence key — never reuse across levels
    number: number;      // 1-based ordering; gaps are not allowed
    worldId: string;     // groups levels into themed worlds in the UI
    label: string;
    description?: string;
    targetScore: number;
    requiredEngagementCount: number;
    modifiers: LevelModifierSpec[];
}

export interface World {
    id: string;
    name: string;
    description?: string;
}

// Maps World.id -> the CSS theme class applied to <body>.
// Adventure level select / GameBoard look up the right token set via
// `body.world-<id>` selectors in `src/styles/themes.css`.
export function worldThemeClass(worldId: string): string {
    return `world-${worldId}`;
}

