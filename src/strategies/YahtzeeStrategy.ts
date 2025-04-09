import { ScoringStrategy } from '../interfaces/ScoringStrategy';
import { Die } from '../types/Die';

export class YahtzeeStrategy implements ScoringStrategy {
    calculateScore(dice: Die[]): number {
        if(dice[0].value === 0){
            return 0;
        }
        return dice.every(die => die.value === dice[0].value) ? 50 : 0;
    }
}