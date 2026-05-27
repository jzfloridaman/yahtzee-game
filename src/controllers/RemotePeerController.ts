import { Categories } from '../enums/Categories';
import { PlayerController, ControllerKind } from './PlayerController';

// A seat driven by a remote peer over the WebRTC data channel. Owned host-side
// — one per remote client seat. In Phase 2, peerStore.handleIncomingData will
// route action messages to the matching instance, which applies them through
// the same chokepoint a local player uses. Phase 1 is scaffolding only.
export class RemotePeerController implements PlayerController {
    readonly kind: ControllerKind = 'remote';

    requestRoll(): void {}
    requestHold(_index: number): void {}
    requestCategory(_category: Categories): void {}
    onTurnStart(): void {}
}
