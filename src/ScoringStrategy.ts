export interface ScoringStrategy {
    calculateScore(dice: Die[]): number;
}