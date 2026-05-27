import type { Categories } from '../enums/Categories';
import type { PlayerController, ControllerKind } from './PlayerController';
import type { YahtzeeGame } from '../game';
import { useGameStore } from '../stores/gameStore';
import { GreedyStrategy } from '../strategies/ai/GreedyStrategy';

const THINK_BEFORE_FIRST_ROLL = 800;
const THINK_BETWEEN_ACTIONS = 1500;
const HOLD_TO_ROLL_DELAY = 700;
const SCORE_TO_NEXT_PLAYER_DELAY = 1500;

// A seat driven by computer-player logic. Drives its own turn via setTimeout
// chains; calls gameStore primitives (applyRoll / applyHold /
// applySelectCategory) directly so it never recurses through the controller
// dispatch. The requestX methods are defensive no-ops — if a UI click somehow
// fires while it's the AI's turn, nothing happens.
export class AIController implements PlayerController {
    readonly kind: ControllerKind = 'ai';

    private strategy = new GreedyStrategy();

    onTurnStart(): void {
        setTimeout(() => this.takeAITurn(), THINK_BEFORE_FIRST_ROLL);
    }

    private takeAITurn(): void {
        const game = useGameStore();
        const yahtzee = game.currentGame;
        if (!yahtzee) return;

        // Sanity check: bail if we're no longer the active player (e.g.,
        // game ended, was restarted, or a stale setTimeout firing).
        const active = yahtzee.players[yahtzee.currentPlayer];
        if (!active || active.controller !== this) return;
        if (yahtzee.isGameOver) return;

        if (yahtzee.newRoll) {
            game.applyRoll();
            setTimeout(() => this.takeAITurn(), THINK_BETWEEN_ACTIONS);
            return;
        }

        const decision = this.strategy.decide(yahtzee as YahtzeeGame);

        if (decision.action === 'pickCategory') {
            this.pickCategory(decision.category);
            return;
        }

        this.applyHoldsAndRoll(decision.holds);
    }

    private pickCategory(category: Categories): void {
        const game = useGameStore();
        game.applySelectCategory(category);

        setTimeout(() => {
            const yahtzee = game.currentGame;
            if (!yahtzee) return;
            if (yahtzee.isGameOver) {
                game.endGame();
                return;
            }
            // nextPlayer fires onTurnStart on the new current player. If
            // that's another AI, its loop kicks off here.
            game.nextPlayer();
        }, SCORE_TO_NEXT_PLAYER_DELAY);
    }

    private applyHoldsAndRoll(targetHolds: boolean[]): void {
        const game = useGameStore();
        const yahtzee = game.currentGame;
        if (!yahtzee) return;

        const dice = yahtzee.dice();
        targetHolds.forEach((shouldHold, i) => {
            if (dice[i] && dice[i].held !== shouldHold) {
                game.applyHold(i);
            }
        });

        setTimeout(() => {
            game.applyRoll();
            setTimeout(() => this.takeAITurn(), THINK_BETWEEN_ACTIONS);
        }, HOLD_TO_ROLL_DELAY);
    }

    // Defensive no-ops. The dispatcher routes UI events to the current
    // player's controller; an AI shouldn't take action from inadvertent
    // human clicks (UI should be blocked, but belt-and-suspenders).
    requestRoll(): void {}
    requestHold(_index: number): void {}
    requestCategory(_category: Categories): void {}
}
