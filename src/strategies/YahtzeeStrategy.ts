import { ScoringStrategy } from '../interfaces/ScoringStrategy.js';
import { Die } from '../types/Die.js';

export class YahtzeeStrategy implements ScoringStrategy {
    calculateScore(dice: Die[]): number {
        return dice.every(die => die.value === dice[0].value) ? 50 : 0;
    }
}