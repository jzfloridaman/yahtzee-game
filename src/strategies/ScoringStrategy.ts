import { Die } from '../Die.js';

export interface ScoringStrategy {
    calculateScore(dice: Die[]): number;
}