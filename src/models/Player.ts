import { Categories } from "../enums/Categories";

export class Player {

    rollsLeft: number = 2;
    scorecard: { [key in Categories]: { value: number | null, selected: boolean } } = {} as any;

    constructor(public name: string, public score: number) {
        //this.initializeScorecard();
    }

    // rolls left,
    // scorecard
    // score
    // is it a local or ai player?
    // score items left
    // score items completed



}