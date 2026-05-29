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
            // Defer the spin: the host applies the roll and sends back the
            // authoritative dice via gameState, which rebuilds the dice
            // objects. Animating now would mutate objects that get discarded,
            // so flag it and let the gameState-apply path animate the new dice.
            game.pendingRollAnimation = true;
            return;
        }

        game.applyRoll();
        if (game.isOnlineHost) {
            // Animation hint for the client; the dice values follow in the
            // gameState broadcast, where the client consumes the hint.
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

        const { score, bonusYahtzee, bonusTurnQueued } = game.applySelectCategory(category);

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

        // Puzzle Mode: Double Category grants a bonus turn — keep the
        // current player, just reset rolls. Only happens in single-player
        // (Puzzle is not exposed in online multiplayer in V1), so no peer
        // sync branch is needed.
        if (bonusTurnQueued) {
            game.startBonusTurn();
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
