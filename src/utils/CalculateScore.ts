import { Die } from '../types/Die';
import { ScoringStrategy } from '../interfaces/ScoringStrategy';
import { UpperScoreStrategy } from '../strategies/UpperScoreStrategy';
import { ThreeOfAKindStrategy } from '../strategies/ThreeOfAKindStrategy';
import { FourOfAKindStrategy } from '../strategies/FourOfAKindStrategy';
import { ChanceStrategy } from '../strategies/ChanceStrategy';
import { ColorsStrategy } from '../strategies/ColorsStrategy';
import { ColorsFullHouseStrategy } from '../strategies/ColorsFullHouseStrategy';    
import { FullHouseStrategy } from '../strategies/FullHouseStrategy';
import { YahtzeeStrategy } from '../strategies/YahtzeeStrategy';
import { LargeStraightStrategy } from '../strategies/LargeStraightStrategy';
import { SmallStraightStrategy } from '../strategies/SmallStraightStrategy';
import { Categories } from '../enums/Categories';

export function useCalculateScore(category: Categories, dice: Die[]): number{
    let strategy: ScoringStrategy;
    
    switch (category) {
        case Categories.Ones:
            strategy = new UpperScoreStrategy(1);
            break;
        case Categories.Twos:
            strategy = new UpperScoreStrategy(2);
            break;
        case Categories.Threes:
            strategy = new UpperScoreStrategy(3);
            break;
        case Categories.Fours:
            strategy = new UpperScoreStrategy(4);
            break;
        case Categories.Fives:
            strategy = new UpperScoreStrategy(5);
            break;
        case Categories.Sixes:
            strategy = new UpperScoreStrategy(6);
            break;


        case Categories.ThreeOfAKind:
            strategy = new ThreeOfAKindStrategy();
            break;
        case Categories.FourOfAKind:
            strategy = new FourOfAKindStrategy();
            break;
        case Categories.Chance:
            strategy = new ChanceStrategy();
            break;
        case Categories.FullHouse:
            strategy = new FullHouseStrategy();
            break;
        case Categories.SmallStraight:
            strategy = new SmallStraightStrategy();
            break;
        case Categories.LargeStraight:
            strategy = new LargeStraightStrategy();
            break;
        case Categories.Yahtzee:
            strategy = new YahtzeeStrategy();
            break;


        case Categories.Blues:
            strategy = new ColorsStrategy(Categories.Blues);
            break;
        case Categories.Reds:
            strategy = new ColorsStrategy(Categories.Reds);
            break;
        case Categories.Greens:
            strategy = new ColorsStrategy(Categories.Greens);
            break;
        case Categories.ColorFullHouse: 
            strategy = new ColorsFullHouseStrategy();
            break;

        default:
            return 0;
    }

    return strategy.calculateScore(dice);
}