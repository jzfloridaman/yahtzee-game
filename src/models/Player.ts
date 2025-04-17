import { Categories } from "../enums/Categories";
import { ScoreManager } from "../managers/ScoreManager";
import { Die } from "../types/Die";

export class Player {
    public scoreManager: ScoreManager;
    public rollsLeft: number = 2;
    public name: string;
    public isAI: boolean;

    constructor(name: string, isAI: boolean = false, initialScore: number = 0) {
        this.name = name;
        this.isAI = isAI;
        this.scoreManager = new ScoreManager(initialScore);
    }

    // Proxy methods to ScoreManager
    initializeScorecard() {
        this.scoreManager.initializeScorecard();
    }
    calculateScore(category: Categories, dice: Die[]): number {
        return this.scoreManager.calculateScore(category, dice);
    }
    updateScorecard(category: Categories, score: number, selected: boolean = false) {
        this.scoreManager.updateScorecard(category, score, selected);
    }
    isCategorySelected(category: Categories): boolean {
        return this.scoreManager.isCategorySelected(category);
    }
    getScorecard() {
        return this.scoreManager.getScorecard();
    }
    getScoreByCategory(category: Categories): number | null {
        return this.scoreManager.getScoreByCategory(category);
    }
    getTotalScore(): number {
        return this.scoreManager.getTotalScore();
    }
    getCompletedCategories(): number {
        return this.scoreManager.getCompletedCategories();
    }
    getRemainingCategories(): number {
        return this.scoreManager.getRemainingCategories();
    }
    getTotalCategories(): number {
        return this.scoreManager.getTotalCategories();
    }
    isUpperScoreBonusApplicable(): number {
        return this.scoreManager.isUpperScoreBonusApplicable();
    }
    setGameOver(isGameOver: boolean) {
        this.scoreManager.setGameOver(isGameOver);
    }
    setTotalScore(totalScore: number) {
        this.scoreManager.setTotalScore(totalScore);
    }
    selectCategory(category: Categories): void {
        this.scoreManager.selectCategory(category);
    }
    get isGameOver(): boolean {
        return this.scoreManager.isGameOver;
    }
}