import { Die } from '../enums/Die.js';

export interface ScoringStrategy {
    calculateScore(dice: Die[]): number;
}