import { Die } from '../types/Die';

export interface ScoringStrategy {
    calculateScore(dice: Die[]): number;
}