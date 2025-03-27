import { IDiceManager } from '../interfaces/IDiceManager';
import { Die } from '../types/Die';

export class DiceManager implements IDiceManager {
    private dice: Die[] = [];

    constructor(length: number = 5) {
        this.dice = Array.from({ length: length }, () => this.rollNewDie());
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

    rollNewDie(): Die {
        return {
            value: Math.floor(Math.random() * 6) + 1,
            color: ['red', 'green', 'blue'][Math.floor(Math.random() * 3)] as 'red' | 'green' | 'blue',
            held: false,
        };
    }
}