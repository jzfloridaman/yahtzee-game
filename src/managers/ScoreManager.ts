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
        };

        // this section should allow for other type of scorecards
    }

    // this needs to be renamed to calculateCategoryScore
    calculateScore(category: Categories, dice: Die[]): number {
        return useCalculateScore(category, dice);
    }

    updateScorecard(category: Categories, score: number, selected: boolean = false) {
        if (!this.scorecard[category].selected) {
            this.scorecard[category].value = score;
        }
        if(selected){
            this.scorecard[category].selected = selected;
            if(category === Categories.Yahtzee){
                this.scorecard[Categories.Yahtzee].value = score;
            }
        }   
    }

    isCategorySelected(category: Categories): boolean {
        return this.scorecard[category].selected;
    }

    getScorecard(): { [key in Categories]: { value: number | null, selected: boolean, group: CategoryGroup } } {
        return this.scorecard;
    }

    setScorecard(scorecard: { [key: string]: { value: number | null; selected: boolean; group: CategoryGroup } }) {
        this.scorecard = scorecard;
    }

    getScoreByCategory(category: Categories): number | null {
        return this.scorecard[category].value;
    }

    getTotalScore(): number {
        let total = Object.values(this.scorecard)
            .filter(item => item.selected)
            .reduce((total, item) => total + (item.value || 0), 0);
        if (this.isUpperSectionBonusAchieved()) {
            total += 35;
        }
        // maybe add this.score = total;
        return total;
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

    isUpperSectionBonusAchieved(): boolean {
        // TODO: have this check the scorecard for all upper section categories
        const upperSectionCategories = [
            Categories.Ones,
            Categories.Twos,
            Categories.Threes,
            Categories.Fours,
            Categories.Fives,
            Categories.Sixes
        ];
        //const upperSectionCategories = Object.values(this.scorecard).filter(item => item.group === CategoryGroup.UpperSection);
        // only sum the scores in scorecard with a group of upper section

        const totalScore = upperSectionCategories.reduce((sum, category) => {
            const entry = this.scorecard[category];
            if(entry.selected && entry.value !== null && entry.group === CategoryGroup.UpperSection){
                return sum + entry.value;
            }
            return sum;
        }, 0);
        return totalScore >= 63;
    }

    setGameOver(isGameOver: boolean){
        this.isGameOver = isGameOver;
    }

    setTotalScore(totalScore: number) {
        this.score = totalScore;
    }

    selectCategory(category: Categories): void {
        if (this.scorecard[category]) {
            this.scorecard[category].selected = true;
        }
    }
}