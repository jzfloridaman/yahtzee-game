import { Die } from './Die';

export class YahtzeeScorecard {
    scorecard: { [key: string]: { value: number | null, type: string } } = {};

    categories = {
        upper: [
            { name: 'Ones', type: 'single' },
            { name: 'Twos', type: 'single' },
            { name: 'Threes', type: 'single' },
            { name: 'Fours', type: 'single' },
            { name: 'Fives', type: 'single' },
            { name: 'Sixes', type: 'single' },
        ],
        lower: [
            { name: 'Three of a Kind', type: 'multiple' },
            { name: 'Four of a Kind', type: 'multiple' },
            { name: 'Full House', type: 'multiple' },
            { name: 'Small Straight', type: 'multiple' },
            { name: 'Large Straight', type: 'multiple' },
            { name: 'Yahtzee', type: 'multiple' },
            { name: 'Chance', type: 'multiple' },
            { name: 'Color Flush', type: 'color' },
            { name: 'Color Straight', type: 'color' },
            { name: 'Color Majority Bonus', type: 'color' },
        ]
    };

    constructor() {
        this.initializeScorecard();
    }

    // Initialize the scorecard with all categories and their types
    private initializeScorecard() {
        [...this.categories.upper, ...this.categories.lower].forEach(category => {
            this.scorecard[category.name] = { value: null, type: category.type };
        });
    }

    // Update the scorecard with a score for a given category
    updateScorecard(category: string, score: number) {
        if (this.scorecard[category] && this.scorecard[category].value === null) {
            this.scorecard[category].value = score; // Assign the score if it's not already scored
        }
    }

    // Calculate the upper score (single value categories)
    calculateUpperScore(category: string, dice: Die[]): number {
        const categoryValues: { [key: string]: number } = {
            'Ones': 1,
            'Twos': 2,
            'Threes': 3,
            'Fours': 4,
            'Fives': 5,
            'Sixes': 6,
        };

        const categoryValue = categoryValues[category];

        if (categoryValue) {
            // Count how many times the category value appears in the dice
            return dice.filter(die => die.value === categoryValue).length * categoryValue;
        }
        return 0;
    }

    // Calculate the lower score (multiple or color-based categories)
    calculateLowerScore(category: string, dice: Die[]): number {
        switch (category) {
            case 'Three of a Kind':
                return this.calculateMultipleOfKind(3, dice);
            case 'Four of a Kind':
                return this.calculateMultipleOfKind(4, dice);
            case 'Full House':
                return this.calculateFullHouse(dice);
            case 'Small Straight':
                return this.calculateSmallStraight(dice);
            case 'Large Straight':
                return this.calculateLargeStraight(dice);
            case 'Yahtzee':
                return this.calculateYahtzee(dice);
            case 'Chance':
                return this.calculateChance(dice);
            case 'Color Flush':
                return this.calculateColorFlush(dice);
            case 'Color Straight':
                return this.calculateColorStraight(dice);
            case 'Color Majority Bonus':
                return this.calculateColorMajorityBonus(dice);
            default:
                return 0;
        }
    }

    // Utility functions for scoring lower categories
    private calculateMultipleOfKind(count: number, dice: Die[]): number {
        const valueCounts = dice.reduce((counts, die) => {
            counts[die.value] = (counts[die.value] || 0) + 1;
            return counts;
        }, {} as { [key: number]: number });

        const matchingValue = Object.keys(valueCounts).find(key => valueCounts[+key] >= count);
        return matchingValue ? +matchingValue * count : 0;
    }

    private calculateFullHouse(dice: Die[]): number {
        const valueCounts = dice.reduce((counts, die) => {
            counts[die.value] = (counts[die.value] || 0) + 1;
            return counts;
        }, {} as { [key: number]: number });

        const counts = Object.values(valueCounts);
        return counts.includes(2) && counts.includes(3) ? 25 : 0;
    }

    private calculateSmallStraight(dice: Die[]): number {
        // Implement logic for small straight
        return 30;
    }

    private calculateLargeStraight(dice: Die[]): number {
        // Implement logic for large straight
        return 40;
    }

    private calculateYahtzee(dice: Die[]): number {
        const uniqueValues = new Set(dice.map(die => die.value));
        return uniqueValues.size === 1 ? 50 : 0;
    }

    private calculateChance(dice: Die[]): number {
        return dice.reduce((total, die) => total + die.value, 0);
    }

    private calculateColorFlush(dice: Die[]): number {
        const colorCounts = dice.reduce((counts, die) => {
            counts[die.color] = (counts[die.color] || 0) + 1;
            return counts;
        }, {} as { [key: string]: number });

        return Object.values(colorCounts).some(count => count >= 5) ? 40 : 0;
    }

    private calculateColorStraight(dice: Die[]): number {
        // Implement color-based straight calculation
        return 50;
    }

    private calculateColorMajorityBonus(dice: Die[]): number {
        const colorCounts = dice.reduce((counts, die) => {
            counts[die.color] = (counts[die.color] || 0) + 1;
            return counts;
        }, {} as { [key: string]: number });

        const majorityColor = Object.keys(colorCounts).find(key => colorCounts[key] >= 3);
        return majorityColor ? 15 : 0;
    }

    // Accessor to get the current scorecard
    getScorecard() {
        return this.scorecard;
    }
}
