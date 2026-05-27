import { Categories } from '../enums/Categories';

export type ControllerKind = 'local' | 'remote' | 'ai';

export interface SeatSpec {
    name: string;
    kind: ControllerKind;
}

// The single dispatch boundary for player actions. Each Player owns one of
// these; gameStore actions will route through `currentPlayer.controller` in
// Phase 2 of docs/refactor-plan.md. In Phase 1 these are scaffolding only —
// the methods are no-ops and the existing branched dispatch in gameStore is
// still authoritative.
export interface PlayerController {
    readonly kind: ControllerKind;
    requestRoll(): void;
    requestHold(index: number): void;
    requestCategory(category: Categories): void;
    onTurnStart(): void;
}
