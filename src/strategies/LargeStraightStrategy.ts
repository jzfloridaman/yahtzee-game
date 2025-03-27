import { ScoringStrategy } from '../interfaces/ScoringStrategy';
import { Die } from '../types/Die';

export class LargeStraightStrategy implements ScoringStrategy {

    calculateScore(dice: Die[]): number {
      const values = [...new Set(dice.map(die => die.value))].sort((a, b) => a - b);
      return (
        values.length === 5 &&
        (values.every((val, i) => val === i + 1) || values.every((val, i) => val === i + 2))
      ) ? 40 : 0;
    }
}