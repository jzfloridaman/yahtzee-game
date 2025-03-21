import { ScoringStrategy } from './ScoringStrategy.js';
import { Die } from '../Die.js';

export class FullHouseStrategy implements ScoringStrategy {

    calculateScore(dice: Die[]): number {

        const dieCounts = new Map<number, number>();
        // Count occurrences of each die value
        for (const die of dice) {
            dieCounts.set(die.value, (dieCounts.get(die.value) || 0) + 1);
        }
        // Check if any die counts match 2 and 3
        return [...dieCounts.values()].sort().join() === "2,3" ? 25 : 0;
    }
}