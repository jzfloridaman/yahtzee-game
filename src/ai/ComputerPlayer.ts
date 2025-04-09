import { Die } from '../types/Die';
import { Categories } from '../enums/Categories';
import { ScoreManager } from '../managers/ScoreManager';

export class ComputerPlayer {
    private scoreManager: ScoreManager;

    constructor(scoreManager: ScoreManager) {
        this.scoreManager = scoreManager;
    }

    // Decide whether to hold or roll dice
    public shouldHoldDice(dice: Die[], rollsLeft: number): boolean[] {
        console.log('Computer deciding which dice to hold...');
        const holds = new Array(dice.length).fill(false);
        
        // If it's the last roll, hold everything
        if (rollsLeft === 0) {
            console.log('Last roll - holding all dice');
            return new Array(dice.length).fill(true);
        }

        // Count occurrences of each value
        const counts = new Array(7).fill(0);
        dice.forEach(die => counts[die.value]++);
        console.log('Current dice counts:', counts);

        // Strategy for holding dice
        for (let i = 0; i < dice.length; i++) {
            const value = dice[i].value;
            
            // Hold if it's part of a potential straight
            if (this.isPartOfStraight(dice, value)) {
                console.log(`Holding die ${i} (value: ${value}) for potential straight`);
                holds[i] = true;
                continue;
            }

            // Hold if it's part of a potential three/four of a kind
            if (counts[value] >= 2) {
                console.log(`Holding die ${i} (value: ${value}) for potential ${counts[value]} of a kind`);
                holds[i] = true;
                continue;
            }

            // Hold if it's a high value (4,5,6) and we're trying for upper section
            if (value >= 4) {
                const category = this.getValueCategory(value);
                if (category && !this.scoreManager.isCategorySelected(category)) {
                    console.log(`Holding die ${i} (value: ${value}) for upper section`);
                    holds[i] = true;
                }
            }
        }

        console.log('Final hold decisions:', holds);
        return holds;
    }

    private getValueCategory(value: number): Categories | null {
        switch(value) {
            case 1: return Categories.Ones;
            case 2: return Categories.Twos;
            case 3: return Categories.Threes;
            case 4: return Categories.Fours;
            case 5: return Categories.Fives;
            case 6: return Categories.Sixes;
            default: return null;
        }
    }

    // Choose the best category to score
    public chooseCategory(dice: Die[]): Categories {
        console.log('Computer choosing category to score...');
        const availableCategories = this.getAvailableCategories();
        let bestCategory = Categories.Chance;
        let bestScore = 0;

        for (const category of availableCategories) {
            const score = this.scoreManager.calculateScore(category, dice);
            console.log(`Category ${category}: ${score} points`);
            
            // Special handling for Yahtzee
            if (category === Categories.Yahtzee && this.isYahtzee(dice)) {
                if (!this.scoreManager.isCategorySelected(Categories.Yahtzee)) {
                    console.log('Choosing Yahtzee category!');
                    return Categories.Yahtzee;
                }
                // If Yahtzee is already scored, consider it for bonus
                if (score > 0) {
                    console.log('Choosing Yahtzee for bonus!');
                    return Categories.Yahtzee;
                }
            }

            // Prefer categories that give more points
            if (score > bestScore) {
                bestScore = score;
                bestCategory = category;
            }
        }

        console.log(`Chose category ${bestCategory} with ${bestScore} points`);
        return bestCategory;
    }

    private getAvailableCategories(): Categories[] {
        const available: Categories[] = [];
        // Only include standard Yahtzee categories, excluding color categories
        const standardCategories = [
            Categories.Ones,
            Categories.Twos,
            Categories.Threes,
            Categories.Fours,
            Categories.Fives,
            Categories.Sixes,
            Categories.ThreeOfAKind,
            Categories.FourOfAKind,
            Categories.FullHouse,
            Categories.SmallStraight,
            Categories.LargeStraight,
            Categories.Yahtzee,
            Categories.Chance
        ];

        for (const category of standardCategories) {
            if (!this.scoreManager.isCategorySelected(category)) {
                available.push(category);
            }
        }
        return available;
    }

    private isPartOfStraight(dice: Die[], value: number): boolean {
        const values = dice.map(d => d.value).sort((a, b) => a - b);
        const uniqueValues = [...new Set(values)];
        
        // Check for small straight (4 consecutive)
        if (uniqueValues.length >= 4) {
            for (let i = 0; i <= uniqueValues.length - 4; i++) {
                if (uniqueValues[i + 3] - uniqueValues[i] === 3) {
                    return value >= uniqueValues[i] && value <= uniqueValues[i + 3];
                }
            }
        }
        
        // Check for large straight (5 consecutive)
        if (uniqueValues.length >= 5) {
            for (let i = 0; i <= uniqueValues.length - 5; i++) {
                if (uniqueValues[i + 4] - uniqueValues[i] === 4) {
                    return value >= uniqueValues[i] && value <= uniqueValues[i + 4];
                }
            }
        }
        
        return false;
    }

    private isYahtzee(dice: Die[]): boolean {
        return dice.every(die => die.value === dice[0].value && die.value !== 0);
    }
} 