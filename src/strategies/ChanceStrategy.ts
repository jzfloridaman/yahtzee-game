import { ScoringStrategy } from './ScoringStrategy.js';
import { Die } from '../Die.js';

export class ChanceStrategy implements ScoringStrategy {
    calculateScore(dice: Die[]): number {
        return dice.reduce((sum, die) => sum + die.value, 0);
    }

}