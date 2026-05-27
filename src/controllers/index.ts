import { PlayerController, ControllerKind } from './PlayerController';
import { LocalHumanController } from './LocalHumanController';
import { RemotePeerController } from './RemotePeerController';
import { AIController } from './AIController';

export { PlayerController, ControllerKind } from './PlayerController';
export type { SeatSpec } from './PlayerController';
export { LocalHumanController } from './LocalHumanController';
export { RemotePeerController } from './RemotePeerController';
export { AIController } from './AIController';

export function createController(kind: ControllerKind): PlayerController {
    switch (kind) {
        case 'local': return new LocalHumanController();
        case 'remote': return new RemotePeerController();
        case 'ai': return new AIController();
    }
}
