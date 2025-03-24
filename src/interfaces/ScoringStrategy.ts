import { Die } from '../types/Die.js';

export interface ScoringStrategy {
    calculateScore(dice: Die[]): number;
}