import { ScoringStrategy } from '../interfaces/ScoringStrategy';
import { Die } from '../types/Die';

export class ChanceStrategy implements ScoringStrategy {
    calculateScore(dice: Die[]): number {
        return dice.reduce((sum, die) => sum + die.value, 0);
    }

}