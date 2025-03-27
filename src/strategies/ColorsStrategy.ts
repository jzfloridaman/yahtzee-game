import { ScoringStrategy } from '../interfaces/ScoringStrategy';
import { Die } from '../types/Die';

export class ColorsStrategy implements ScoringStrategy {
    private color: string;

    constructor(color: string) {
        this.color = color;
    }

    calculateScore(dice: Die[]): number {
        return dice.every(die => die.color === this.color) ? 35 : 0;
    }
}