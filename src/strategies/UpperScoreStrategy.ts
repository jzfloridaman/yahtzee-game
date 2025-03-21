import { ScoringStrategy } from './ScoringStrategy.js';
import { Die } from '../enums/Die.js';

export class UpperScoreStrategy implements ScoringStrategy {
    private value: number;

    constructor(value: number) {
        this.value = value;
    }

    calculateScore(dice: Die[]): number {
        return dice.filter(die => die.value === this.value).length * this.value;
    }
}