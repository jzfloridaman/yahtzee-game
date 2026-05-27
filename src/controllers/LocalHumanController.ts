import { Categories } from '../enums/Categories';
import { PlayerController, ControllerKind } from './PlayerController';

// A player driven by direct UI input on this device. In Phase 2 the methods
// here will call into gameStore actions; in Phase 1 they are scaffolding.
export class LocalHumanController implements PlayerController {
    readonly kind: ControllerKind = 'local';

    requestRoll(): void {}
    requestHold(_index: number): void {}
    requestCategory(_category: Categories): void {}
    onTurnStart(): void {}
}
