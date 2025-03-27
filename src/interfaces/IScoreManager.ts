import { Categories } from "../enums/Categories";
import { Die } from "../types/Die";

export interface IScoreManager {
    calculateScore(category: Categories, dice: Die[]): number;
    updateScorecard(category: Categories, score: number): void;
    
    isCategorySelected(category: Categories): boolean;

    getTotalScore(): number;
    getCompletedCategories(): number;
    getRemainingCategories(): number;
    getTotalCategories(): number;
}