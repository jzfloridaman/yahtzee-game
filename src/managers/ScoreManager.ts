import { IScoreManager } from '../interfaces/IScoreManager';
import { Categories } from '../enums/Categories';
import { useCalculateScore } from '../utils/CalculateScore';
import { Die } from '../types/Die';
import { CategoryGroup } from '../enums/CategoryGroup';
import { RAINBOW_TEMPLATE, ScorecardTemplateEntry } from '../config/scorecardTemplates';

type ScorecardEntry = { value: number | null; selected: boolean; group: CategoryGroup };
type Scorecard = Partial<Record<Categories, ScorecardEntry>>;

export class ScoreManager implements IScoreManager {
    private scorecard: Scorecard = {};
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

    initializeScorecard(template: ScorecardTemplateEntry[] = RAINBOW_TEMPLATE) {
        const next: Scorecard = {};
        for (const entry of template) {
            next[entry.category] = { value: null, selected: false, group: entry.group };
        }
        this.scorecard = next;
    }

    // this needs to be renamed to calculateCategoryScore
    calculateScore(category: Categories, dice: Die[]): number {
        return useCalculateScore(category, dice);
    }

    updateScorecard(category: Categories, score: number, selected: boolean = false) {
        const slot = this.scorecard[category];
        if (!slot) return;
        if (!slot.selected) {
            slot.value = score;
        }
        if (selected) {
            slot.selected = selected;
            if (category === Categories.Yahtzee) {
                slot.value = score;
            }
        }
    }

    // Adds `delta` to the existing slot value, ignoring the "already selected"
    // guard. Used for Puzzle Mode's Double Category bonus-turn second score,
    // which sums onto a slot that's already been marked selected.
    addScoreToCategory(category: Categories, delta: number): void {
        const slot = this.scorecard[category];
        if (!slot) return;
        slot.value = (slot.value ?? 0) + delta;
    }

    isCategorySelected(category: Categories): boolean {
        return this.scorecard[category]?.selected ?? false;
    }

    getScorecard(): Scorecard {
        return this.scorecard;
    }

    setScorecard(scorecard: Scorecard) {
        this.scorecard = scorecard;
    }

    getScoreByCategory(category: Categories): number | null {
        return this.scorecard[category]?.value ?? null;
    }

    getTotalScore(): number {
        let total = Object.values(this.scorecard)
            .filter((item): item is ScorecardEntry => !!item && item.selected)
            .reduce((sum, item) => sum + (item.value || 0), 0);
        if (this.isUpperSectionBonusAchieved()) {
            total += 35;
        }
        return total;
    }

    getCompletedCategories(): number {
        return Object.values(this.scorecard).filter((item) => item?.selected).length;
    }

    getRemainingCategories(): number {
        return this.getTotalCategories() - this.getCompletedCategories();
    }

    getTotalCategories(): number {
        return Object.keys(this.scorecard).length;
    }

    isUpperSectionBonusAchieved(): boolean {
        const upperSectionCategories = [
            Categories.Ones,
            Categories.Twos,
            Categories.Threes,
            Categories.Fours,
            Categories.Fives,
            Categories.Sixes
        ];

        const totalScore = upperSectionCategories.reduce((sum, category) => {
            const entry = this.scorecard[category];
            if (entry?.selected && entry.value !== null && entry.group === CategoryGroup.UpperSection) {
                return sum + entry.value;
            }
            return sum;
        }, 0);
        return totalScore >= 63;
    }

    setGameOver(isGameOver: boolean) {
        this.isGameOver = isGameOver;
    }

    setTotalScore(totalScore: number) {
        this.score = totalScore;
    }

    selectCategory(category: Categories): void {
        const slot = this.scorecard[category];
        if (slot) {
            slot.selected = true;
        }
    }
}
