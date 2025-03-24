import { Categories } from "../enums/Categories";

export interface IScoreManager {
    calculateScore(category: Categories): number;
    updateScorecard(category: Categories, score: number): void;
    getTotalScore(): number;
}