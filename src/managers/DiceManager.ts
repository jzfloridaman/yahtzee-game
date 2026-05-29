import { IDiceManager } from '../interfaces/IDiceManager';
import { Die, DieColor } from '../types/Die';

export type DiceManagerConfig = {
    assignColor?: boolean;
};

export class DiceManager implements IDiceManager {

    private dice: Die[] = [];
    private dieSides: number = 6; /* 1 for testing, 6 is normal */
    private assignColor: boolean;

    constructor(length: number = 5, config: DiceManagerConfig = {}) {
        this.assignColor = config.assignColor ?? true;
        this.dice = Array.from({ length: length }, () => this.setupDice());
    }

    rollDice() {
        this.dice = this.dice.map(die => (die.held ? die : this.rollNewDie()));
    }

    toggleHold(index: number) {
        this.dice[index].held = !this.dice[index].held;
    }

    getDice(): Die[] {
        return this.dice;
    }

    setDice(dice: Die[]) {
        // Ensure we're creating new Die objects with all properties.
        // `isRolling` is purely-visual, device-local state — never adopt it
        // from a wire snapshot (the sender's dice have already settled, so it
        // would clobber an animation the receiver just started). The local
        // playRollDiceAnimation owns this flag.
        this.dice = dice.map(die => {
            const next: Die = {
                value: die.value,
                held: die.held,
                isRolling: false,
            };
            if (this.assignColor) {
                next.color = die.color ?? 'blank';
            }
            return next;
        });
    }

    resetDice(): Die[] {
        this.dice = Array.from({ length: this.dice.length }, () => this.setupDice());
        return this.dice;
    }

    setupDice(): Die {
        const die: Die = {
            value: 0,
            held: false,
            isRolling: false,
        };
        if (this.assignColor) {
            die.color = 'blank';
        }
        return die;
    }

    rollNewDie(): Die {
        const die: Die = {
            value: Math.floor(Math.random() * this.dieSides) + 1,
            held: false,
            isRolling: false,
        };
        if (this.assignColor) {
            die.color = ['red', 'green', 'blue'][Math.floor(Math.random() * 3)] as DieColor;
        }
        return die;
    }
}
