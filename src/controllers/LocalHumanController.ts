import type { Categories } from '../enums/Categories';
import type { PlayerController, ControllerKind } from './PlayerController';
import { useGameStore } from '../stores/gameStore';
import { usePeerStore } from '../stores/peerStore';

// A player driven by direct UI input on this device.
//
// In an online game the client side defers to the host: actions are sent as
// peer messages, and the authoritative state arrives back via gameState. In
// every other case (single-player, local multi, host-side seat) the action is
// applied locally; if we're the online host we also broadcast the new state
// plus a thin animation hint so the client can render the same feedback.
export class LocalHumanController implements PlayerController {
    readonly kind: ControllerKind = 'local';

    requestRoll(): void {
        const game = useGameStore();
        const peer = usePeerStore();

        if (game.isOnlineClient) {
            peer.sendData({ type: 'rollDice' });
            game.playRollDiceAnimation();
            return;
        }

        game.applyRoll();
        if (game.isOnlineHost) {
            // Fire the animation hint before the new dice values so the
            // client starts spinning before the values update underneath.
            peer.sendData({ type: 'rollDice' });
            game.sendGameState();
        }
    }

    requestHold(index: number): void {
        const game = useGameStore();
        const peer = usePeerStore();

        if (game.isOnlineClient) {
            peer.sendData({ type: 'holdDice', index });
            return;
        }

        game.applyHold(index);
        if (game.isOnlineHost) {
            game.sendGameState();
        }
    }

    requestCategory(category: Categories): void {
        const game = useGameStore();
        const peer = usePeerStore();

        if (game.isOnlineClient) {
            peer.sendData({ type: 'selectCategory', category });
            return;
        }

        const { score, bonusYahtzee } = game.applySelectCategory(category);

        if (game.currentGame?.isGameOver) {
            if (game.isOnlineHost) {
                game.sendGameState();
                peer.sendData({ type: 'selectCategory', category, score });
                if (bonusYahtzee > 0) {
                    peer.sendData({ type: 'bonusYahtzee', score: bonusYahtzee });
                }
                peer.sendData({ type: 'gameOver' });
            }
            game.endGame();
            return;
        }

        game.nextPlayer();
        if (game.isOnlineHost) {
            game.sendGameState();
            peer.sendData({ type: 'selectCategory', category, score });
            if (bonusYahtzee > 0) {
                peer.sendData({ type: 'bonusYahtzee', score: bonusYahtzee });
            }
        }
    }

    onTurnStart(): void {}
}
