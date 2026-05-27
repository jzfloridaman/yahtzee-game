import { ScoringStrategy } from '../interfaces/ScoringStrategy';
import { Die } from '../types/Die';

export class ColorsFullHouseStrategy implements ScoringStrategy {

    calculateScore(dice: Die[]): number {
        //const uniqueColors = new Set(dice.map(die => die.color));   // map colors to a set to get unique colors
        //return uniqueColors.size === 2 ? 25 : 0;

        const colorCounts = new Map<string, number>();
        // Count occurrences of each color
        for (const die of dice) {
            const color = die.color ?? 'blank';
            colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
        }
        // Check if any color counts match 2 and 3
        return [...colorCounts.values()].sort().join() === "2,3" ? 15 : 0;
    }
}