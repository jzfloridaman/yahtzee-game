import { IDiceManager } from '../interfaces/IDiceManager';
import { Die } from '../types/Die';

export class DiceManager implements IDiceManager {
    
    private dice: Die[] = [];
    private dieSides: number = 6; /* 1 for testing, 6 is normal */

    constructor(length: number = 5) {
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
        this.dice = dice;
    }

    resetDice(): Die[] {
        this.dice = Array.from({ length: this.dice.length }, () => this.setupDice());
        return this.dice;
    }

    setupDice(): Die{
        return {
            value: 0,
            color: 'blank',
            held: false,
            isRolling: false,
        };
    }

    rollNewDie(): Die {
        return {
            value: Math.floor(Math.random() * this.dieSides) + 1,
            color: ['red', 'green', 'blue'][Math.floor(Math.random() * 3)] as 'red' | 'green' | 'blue',
            held: false,
            isRolling: false,
        };
    }
}