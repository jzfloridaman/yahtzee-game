import { IScoreManager } from '../interfaces/IScoreManager';
import { Categories } from '../enums/Categories';
import { useCalculateScore } from '../utils/CalculateScore';
import { Die } from '../types/Die';

export class ScoreManager implements IScoreManager {
    private scorecard: { [key in Categories]: { value: number | null; selected: boolean } } = {} as any;
    private upperScore: number = 0;
    private lowerScore: number = 0;
    private totalScore: number = 0;

    constructor() {
        this.initializeScorecard();
    }

    initializeScorecard() {
        console.log('Initializing scorecard...');
        // Initialize all categories with null scores and unselected state
        for (const category in Categories) {
            if (isNaN(Number(category))) { // Ensure it's a string key, not a numeric index
                const categoryEnum = Categories[category as keyof typeof Categories];
                this.scorecard[categoryEnum] = { value: null, selected: false };
                console.log(`Initialized category ${category}:`, this.scorecard[categoryEnum]);
            }
        }
        console.log('Total categories initialized:', Object.keys(this.scorecard).length);
    }

    calculateScore(category: Categories, dice: Die[]): number {
        return useCalculateScore(category, dice);
    }

    updateScorecard(category: Categories, score: number | null, selected: boolean = false) {
        if (!this.scorecard[category]) {
            this.scorecard[category] = { value: null, selected: false };
        }
        this.scorecard[category].value = score;
        this.scorecard[category].selected = selected;
        this.calculateScores();
    }

    isCategorySelected(category: Categories): boolean {
        return this.scorecard[category]?.selected || false;
    }

    getScorecard(): { [key: string]: { value: number | null; selected: boolean } } {
        const result: { [key: string]: { value: number | null; selected: boolean } } = {};
        for (const category in Categories) {
            if (isNaN(Number(category))) { // Ensure it's a string key, not a numeric index
                const categoryEnum = Categories[category as keyof typeof Categories];
                result[category] = {
                    value: this.scorecard[categoryEnum]?.value ?? null,
                    selected: this.scorecard[categoryEnum]?.selected ?? false
                };
            }
        }
        return result;
    }

    getScoreByCategory(category: Categories): number | null {
        return this.scorecard[category]?.value ?? null;
    }

    getTotalScore(): number {
        return this.totalScore;
    }

    getCompletedCategories(): number {
        return Object.values(this.scorecard).filter(item => item.selected).length;
    }

    getRemainingCategories(): number {
        const remaining = Object.values(this.scorecard).filter(entry => !entry.selected).length;
        console.log('Remaining categories:', remaining);
        return remaining;
    }

    getTotalCategories(): number {
        return Object.keys(this.scorecard).length;
    }

    calculateScores() {
        this.upperScore = 0;
        this.lowerScore = 0;
        
        // Calculate upper score (1-6)
        const upperCategories = [
            Categories.Ones,
            Categories.Twos,
            Categories.Threes,
            Categories.Fours,
            Categories.Fives,
            Categories.Sixes
        ];
        
        upperCategories.forEach(category => {
            const score = this.getScoreByCategory(category);
            if (score !== null) {
                this.upperScore += score;
            }
        });

        // Calculate lower score (other categories)
        const lowerCategories = [
            Categories.ThreeOfAKind,
            Categories.FourOfAKind,
            Categories.FullHouse,
            Categories.SmallStraight,
            Categories.LargeStraight,
            Categories.Yahtzee,
            Categories.Chance
        ];

        lowerCategories.forEach(category => {
            const score = this.getScoreByCategory(category);
            if (score !== null) {
                this.lowerScore += score;
            }
        });

        // Add upper bonus if applicable
        if (this.upperScore >= 63) {
            this.upperScore += 35;
        }

        this.totalScore = this.upperScore + this.lowerScore;
    }

    isUpperScoreBonusApplicable(): number {
        return this.upperScore;
    }
}