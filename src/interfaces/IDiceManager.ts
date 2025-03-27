import { Die } from "../types/Die";

export interface IDiceManager {
    rollDice(): void;
    toggleHold(index: number): void;
    getDice(): Die[];
    rollNewDie(): Die;
}