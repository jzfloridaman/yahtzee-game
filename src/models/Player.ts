import { Categories } from "../enums/Categories";

export class Player {

    rollsLeft: number = 2;
    scorecard: { [key in Categories]: { value: number | null, selected: boolean } } = {} as any;

    constructor(public name: string, public score: number) {
        this.initializeScorecard();
    }

    // rolls left,
    // scorecard
    // score
    // is it a local or ai player?
    // score items left
    // score items completed
    initializeScorecard() {
        this.scorecard = {
            [Categories.Ones]: { value: null, selected: false },
            [Categories.Twos]: { value: null, selected: false },
            [Categories.Threes]: { value: null, selected: false },
            [Categories.Fours]: { value: null, selected: false },
            [Categories.Fives]: { value: null, selected: false },
            [Categories.Sixes]: { value: null, selected: false },

            [Categories.ThreeOfAKind]: { value: null, selected: false },
            [Categories.FourOfAKind]: { value: null, selected: false },
            [Categories.FullHouse]: { value: null, selected: false },
            [Categories.SmallStraight]: { value: null, selected: false },
            [Categories.LargeStraight]: { value: null, selected: false },

            [Categories.Yahtzee]: { value: null, selected: false },
            [Categories.Chance]: { value: null, selected: false },

            [Categories.Blues]: { value: null, selected: false },
            [Categories.Reds]: { value: null, selected: false },
            [Categories.Greens]: { value: null, selected: false },
            [Categories.ColorFullHouse]: { value: null, selected: false },
            [Categories.TopBonus]: { value: null, selected: false },
        };
    }

    
}