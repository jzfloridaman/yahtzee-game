import { ScoringStrategy } from '../interfaces/ScoringStrategy.js';
import { Die } from '../types/Die.js';

export class FourOfAKindStrategy implements ScoringStrategy {
    calculateScore(dice: Die[]): number {
        const counts = this.countDice(dice);
        for (let num in counts) {
            if (counts[num] >= 4) {
                return dice.reduce((sum, die) => sum + die.value, 0);
            }
        }
        return 0;
    }

    private countDice(dice: Die[]): Record<number, number> {
        const counts: Record<number, number> = {};
        for (const die of dice) {
            counts[die.value] = (counts[die.value] || 0) + 1;
        }
        return counts;
    }
}