import { IScoreManager } from '../interfaces/IScoreManager';
import { Categories } from '../enums/Categories.js';
import { useCalculateScore } from '../utils/CalculateScore.js';
import { Die } from '../types/Die';

export class ScoreManager implements IScoreManager {
    private scorecard: { [key in Categories]: { value: number | null, selected: boolean } } = {} as any;

    constructor() {
        this.initializeScorecard();
    }

    initializeScorecard() {
        this.scorecard = {
            [Categories.Ones]: { value: null, selected: false },
            [Categories.Twos]: { value: null, selected: false },
            [Categories.Threes]: { value: null, selected: false },
            [Categories.Fours]: { value: null, selected: false },
            [Categories.Fives]: { value: null, selected: false },
            [Categories.Sixes]: { value: null, selected: false },

            [Categories.ThreeOfAKind]: { value: null, selected: false },
            [Categories.FourOfAKind]: { value: null, selected: false },
            [Categories.FullHouse]: { value: null, selected: false },
            [Categories.SmallStraight]: { value: null, selected: false },
            [Categories.LargeStraight]: { value: null, selected: false },

            [Categories.Yahtzee]: { value: null, selected: false },
            [Categories.Chance]: { value: null, selected: false },

            [Categories.Blues]: { value: null, selected: false },
            [Categories.Reds]: { value: null, selected: false },
            [Categories.Greens]: { value: null, selected: false },
            [Categories.ColorFullHouse]: { value: null, selected: false },
            [Categories.TopBonus]: { value: null, selected: false },
        };
    }

    calculateScore(category: Categories, dice: Die[]): number {
        return useCalculateScore(category, dice);
    }

    updateScorecard(category: Categories, score: number, selected: boolean = false) {
        if (!this.scorecard[category].selected) {
            this.scorecard[category].value = score;
        }
        if(selected){
            this.scorecard[category].selected = selected;
        }   
    }

    isCategorySelected(category: Categories): boolean {
        return this.scorecard[category].selected;
    }

    getScorecard(): { [key in Categories]: { value: number | null, selected: boolean } } {
        return this.scorecard;
    }

    getScoreByCategory(category: Categories): number | null {
        return this.scorecard[category].value;
    }

    getTotalScore(): number {
        return Object.values(this.scorecard)
            .filter(item => item.selected)
            .reduce((total, item) => total + (item.value || 0), 0);
    }

    getCompletedCategories(): number {
        return Object.values(this.scorecard).filter(item => item.selected).length;
    }

    getRemainingCategories(): number {
        return this.getTotalCategories() - this.getCompletedCategories();
    }

    getTotalCategories(): number {
        return Object.keys(this.scorecard).length;
    }

    isUpperScoreBonusApplicable(){
        const upperSectionCategories = [
            Categories.Ones,
            Categories.Twos,
            Categories.Threes,
            Categories.Fours,
            Categories.Fives,
            Categories.Sixes
        ];
        
        const totalScore = upperSectionCategories.reduce((sum, category) => {
            if(this.scorecard[category].selected){
                return sum + (this.scorecard[category].value || 0);
            }
            return sum;
        }, 0);

        if(totalScore >= 63){
            this.updateScorecard(Categories.TopBonus, 35, false);
            return true;
        }else{
            //console.log("Top score counter " + totalScore);
        }
    }

}