import type { Categories } from '../enums/Categories';
import type { PlayerController, ControllerKind } from './PlayerController';
import { useGameStore } from '../stores/gameStore';
import { usePeerStore } from '../stores/peerStore';

// A seat driven by a remote peer over the WebRTC data channel. Lives host-side
// only — one instance per remote client seat. peerStore forwards inbound
// action messages to gameStore.handleIncomingData, which routes them to the
// matching RemotePeerController. Every requestX method applies the action
// locally and broadcasts the resulting state so the originating client sees
// authoritative results.
export class RemotePeerController implements PlayerController {
    readonly kind: ControllerKind = 'remote';

    private hostGuard(): boolean {
        if (!usePeerStore().isHost) {
            console.warn('RemotePeerController invoked off-host; ignoring');
            return false;
        }
        return true;
    }

    requestRoll(): void {
        if (!this.hostGuard()) return;
        const game = useGameStore();
        game.applyRoll();
        game.sendGameState();
    }

    requestHold(index: number): void {
        if (!this.hostGuard()) return;
        const game = useGameStore();
        game.applyHold(index);
        game.sendGameState();
    }

    requestCategory(category: Categories): void {
        if (!this.hostGuard()) return;
        const game = useGameStore();
        const peer = usePeerStore();

        const { score, bonusYahtzee } = game.applySelectCategory(category);

        if (game.currentGame?.isGameOver) {
            game.sendGameState();
            peer.sendData({ type: 'selectCategory', category, score });
            if (bonusYahtzee > 0) {
                peer.sendData({ type: 'bonusYahtzee', score: bonusYahtzee });
            }
            peer.sendData({ type: 'gameOver' });
            game.endGame();
            return;
        }

        game.nextPlayer();
        game.sendGameState();
        peer.sendData({ type: 'selectCategory', category, score });
        if (bonusYahtzee > 0) {
            peer.sendData({ type: 'bonusYahtzee', score: bonusYahtzee });
        }
    }

    onTurnStart(): void {}
}
