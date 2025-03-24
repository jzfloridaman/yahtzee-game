import { Die } from './types/Die.js';
import { Categories } from './enums/Categories.js';
import { DiceManager } from './managers/DiceManager.js';
import { ScoreManager } from './managers/ScoreManager.js';
import { GameState } from './enums/GameState.js';
import { GameMode } from './enums/GameMode.js';
import { initializeUI } from './ui/ui.js';

// Game state
export class YahtzeeGame {

    private diceManager: DiceManager;
    private scoreManager: ScoreManager;

    rollsLeft: number = 2;
    players: number = 1;    // array of Player objects
    currentPlayer: number = 0;  // reference to current player in players array
    gameType: GameMode = GameMode.SinglePlayer;

    private _state: GameState = GameState.MainMenu;
    private stateChangeCallbacks: Array<(newState: GameState) => void> = [];

    constructor() {
        this.diceManager = new DiceManager();
        this.scoreManager = new ScoreManager();
    }

    get state(): GameState {
        return this._state;
    }

    set state(newState: GameState) {
        this._state = newState;
        this.notifyStateChange(newState);
    }

    onStateChange(callback: (newState: GameState) => void) {
        this.stateChangeCallbacks.push(callback);
    }

    private notifyStateChange(newState: GameState) {
        this.stateChangeCallbacks.forEach(callback => callback(newState));
    }

    dice(): Die[] {
        return this.diceManager.getDice();
    }

    startNewGame(){
        // check gamemode
        // if multiplayer, set up players
        this.initializeScorecard();
        this.startNewRoll();
        this.state = GameState.Playing;
    }

    initializeDice() {
        this.diceManager = new DiceManager();
    }

    initializeScorecard() {
        this.scoreManager = new ScoreManager();
    }

    setGameOver(){
        this.state = GameState.GameOver;
    }

    isGameOver(): Boolean {
        if(this.scoreManager.getRemainingCategories() === 0){
            this.setGameOver();
            return true;
        }

        // check to see if the last category is just the top bonus
        // this needs a better implementation.
        if(this.scoreManager.getRemainingCategories() === 1 && !this.scoreManager.isCategorySelected(Categories.TopBonus)){
            this.scoreManager.isUpperScoreBonusApplicable();
            this.calculateAllScores();
            this.setGameOver();
            return true;
        }

        return false;
    }

    startNewRoll(){
        if(!this.isGameOver()){
            // if multiplayer, switch to next player, load/save data
            this.rollsLeft = 2;
            this.initializeDice();
        }
    }

    rollDice() {
        if (this.rollsLeft > 0 && !this.isGameOver()) {
            this.diceManager.rollDice();
            this.rollsLeft--;
        }
    }

    toggleHold(index: number) {
        this.diceManager.toggleHold(index);
    }

    // generate score for the scorecard ui board based on current dice roll.
    calculateScore(category: Categories): number {
        return this.scoreManager.calculateScore(category, this.diceManager.getDice());
    }
    calculateAllScores() {
        for (const category in Categories) {
            if (isNaN(Number(category))) { // Ensure it's a string key, not a numeric index
                const score = this.calculateScore(Categories[category as keyof typeof Categories]);
                this.scoreManager.updateScorecard(Categories[category as keyof typeof Categories], score);
            }
        }
        // check if upper score bonus is applicable
        this.scoreManager.isUpperScoreBonusApplicable();
    }
    // update the actual player score based on the selected category
    updateSelectedScore(category: Categories, score: number, roll: boolean = true){ 
        if(this.scoreManager.isCategorySelected(category)){
            return;
        }
        this.scoreManager.updateScorecard(category, score, true);
        if(roll){
            this.startNewRoll();
        }
    }

    isCategorySelected(category: Categories): boolean {
        return this.scoreManager.isCategorySelected(category);
    }

    getScoreByCategory(category: Categories): number | null {
        return this.scoreManager.getScoreByCategory(category);
    }

    getTotalScore(): number {
        return this.scoreManager.getTotalScore();
    }
}

const game = new YahtzeeGame();
initializeUI(game);

/* 
    TODO: 
    - Add computer player
    - Add animations
    - Add sounds
    - abstract player specific logic to allow for multiplayer

    IDEAS:
        - ADD a rule class that allows you to select rolls, categories, and scoring strategies
*/