import { Categories } from '../enums/Categories';
import { CategoryGroup } from '../enums/CategoryGroup';
import { GameVariant } from '../enums/GameVariant';

export type ScorecardTemplateEntry = {
    category: Categories;
    group: CategoryGroup;
};

export const RAINBOW_TEMPLATE: ScorecardTemplateEntry[] = [
    { category: Categories.Ones, group: CategoryGroup.UpperSection },
    { category: Categories.Twos, group: CategoryGroup.UpperSection },
    { category: Categories.Threes, group: CategoryGroup.UpperSection },
    { category: Categories.Fours, group: CategoryGroup.UpperSection },
    { category: Categories.Fives, group: CategoryGroup.UpperSection },
    { category: Categories.Sixes, group: CategoryGroup.UpperSection },

    { category: Categories.ThreeOfAKind, group: CategoryGroup.LowerSection },
    { category: Categories.FourOfAKind, group: CategoryGroup.LowerSection },
    { category: Categories.FullHouse, group: CategoryGroup.LowerSection },
    { category: Categories.SmallStraight, group: CategoryGroup.LowerSection },
    { category: Categories.LargeStraight, group: CategoryGroup.LowerSection },
    { category: Categories.Chance, group: CategoryGroup.LowerSection },

    { category: Categories.Yahtzee, group: CategoryGroup.LowerSection },
    { category: Categories.Blues, group: CategoryGroup.LowerSection },
    { category: Categories.Reds, group: CategoryGroup.LowerSection },
    { category: Categories.Greens, group: CategoryGroup.LowerSection },
    { category: Categories.ColorFullHouse, group: CategoryGroup.LowerSection },
];

export const PUZZLE_TEMPLATE: ScorecardTemplateEntry[] = [
    { category: Categories.Ones, group: CategoryGroup.UpperSection },
    { category: Categories.Twos, group: CategoryGroup.UpperSection },
    { category: Categories.Threes, group: CategoryGroup.UpperSection },
    { category: Categories.Fours, group: CategoryGroup.UpperSection },
    { category: Categories.Fives, group: CategoryGroup.UpperSection },
    { category: Categories.Sixes, group: CategoryGroup.UpperSection },

    { category: Categories.ThreeOfAKind, group: CategoryGroup.LowerSection },
    { category: Categories.FourOfAKind, group: CategoryGroup.LowerSection },
    { category: Categories.FullHouse, group: CategoryGroup.LowerSection },
    { category: Categories.SmallStraight, group: CategoryGroup.LowerSection },
    { category: Categories.LargeStraight, group: CategoryGroup.LowerSection },
    { category: Categories.Chance, group: CategoryGroup.LowerSection },

    { category: Categories.Yahtzee, group: CategoryGroup.LowerSection },
];

export function getScorecardTemplate(variant: GameVariant): ScorecardTemplateEntry[] {
    return variant === GameVariant.Puzzle ? PUZZLE_TEMPLATE : RAINBOW_TEMPLATE;
}
