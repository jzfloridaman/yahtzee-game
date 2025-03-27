import { ScoringStrategy } from '../interfaces/ScoringStrategy';
import { Die } from '../types/Die';

export class SmallStraightStrategy implements ScoringStrategy {

    calculateScore(dice: Die[]): number {
        const values = [...new Set(dice.map(die => die.value))].sort((a, b) => a - b);

        const straights = [
          [1, 2, 3, 4], 
          [2, 3, 4, 5], 
          [3, 4, 5, 6]
        ];
      
        return straights.some(straight => straight.every(num => values.includes(num))) ? 30 : 0;
    }
}