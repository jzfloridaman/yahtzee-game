import { IScoreManager } from '../interfaces/IScoreManager';
import { Categories } from '../enums/Categories';
import { useCalculateScore } from '../utils/CalculateScore';
import { Die } from '../types/Die';
import { CategoryGroup } from '../enums/CategoryGroup';

export class ScoreManager implements IScoreManager {
    private scorecard: { [key in Categories]: { value: number | null, selected: boolean, group: CategoryGroup } } = {} as any;
    public score: number;
    public lowerSectionScore: number;
    public upperSectionScore: number;
    public bonusScore: number;
    public isGameOver: boolean; // flag if the game is over for this player

    constructor(score: number = 0) {
        this.initializeScorecard();
        this.score = score;
        this.lowerSectionScore = 0;
        this.upperSectionScore = 0;
        this.bonusScore = 0;
        this.isGameOver = false;
    }

    initializeScorecard() {
        this.scorecard = {
            [Categories.Ones]: { value: null, selected: false, group: CategoryGroup.UpperSection },
            [Categories.Twos]: { value: null, selected: false, group: CategoryGroup.UpperSection },
            [Categories.Threes]: { value: null, selected: false, group: CategoryGroup.UpperSection },
            [Categories.Fours]: { value: null, selected: false, group: CategoryGroup.UpperSection },
            [Categories.Fives]: { value: null, selected: false, group: CategoryGroup.UpperSection },
            [Categories.Sixes]: { value: null, selected: false, group: CategoryGroup.UpperSection },

            [Categories.ThreeOfAKind]: { value: null, selected: false, group: CategoryGroup.LowerSection },
            [Categories.FourOfAKind]: { value: null, selected: false, group: CategoryGroup.LowerSection },
            [Categories.FullHouse]: { value: null, selected: false, group: CategoryGroup.LowerSection },
            [Categories.SmallStraight]: { value: null, selected: false, group: CategoryGroup.LowerSection },
            [Categories.LargeStraight]: { value: null, selected: false, group: CategoryGroup.LowerSection },
            [Categories.Chance]: { value: null, selected: false, group: CategoryGroup.LowerSection },

            [Categories.Yahtzee]: { value: null, selected: false, group: CategoryGroup.LowerSection },
            [Categories.Blues]: { value: null, selected: false, group: CategoryGroup.LowerSection },
            [Categories.Reds]: { value: null, selected: false, group: CategoryGroup.LowerSection },
            [Categories.Greens]: { value: null, selected: false, group: CategoryGroup.LowerSection },
            [Categories.ColorFullHouse]: { value: null, selected: false, group: CategoryGroup.LowerSection },

            [Categories.TopBonus]: { value: null, selected: false, group: CategoryGroup.Bonus },    // this needs to be removed
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
            if(category !== Categories.TopBonus){
                this.isUpperScoreBonusApplicable();
            }
            if(category === Categories.Yahtzee){
                this.scorecard[Categories.Yahtzee].value = score;
            }
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

    isUpperScoreBonusApplicable(): number {
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
            this.updateScorecard(Categories.TopBonus, 35, true);
        }

        return totalScore;
    }

    setGameOver(isGameOver: boolean){
        this.isGameOver = isGameOver;
    }
}