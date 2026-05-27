import { Categories } from '../enums/Categories';
import { PlayerController, ControllerKind } from './PlayerController';

// A seat driven by computer-player logic. Phase 4 fills in the strategy
// (greedy: pick the highest-scoring available category, hold dice toward it,
// with a small "thinking" delay between actions). Phase 1 is scaffolding.
export class AIController implements PlayerController {
    readonly kind: ControllerKind = 'ai';

    requestRoll(): void {}
    requestHold(_index: number): void {}
    requestCategory(_category: Categories): void {}
    onTurnStart(): void {}
}
