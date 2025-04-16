import { Die } from './types/Die';
import { Categories } from './enums/Categories';
import { DiceManager } from './managers/DiceManager';
import { ScoreManager } from './managers/ScoreManager';
import { GameState } from './enums/GameState';
import { GameMode } from './enums/GameMode';

interface GameStateData {
  currentPlayer: number;
  dice: Die[];
  rollsLeft: number;
  scores: number[];
  categories: { [key: string]: boolean };
  newRoll: boolean;
  selectedCategories?: Categories[];
}

// Game state
export class YahtzeeGame {

    private diceManager: DiceManager;
    public scoreManager: ScoreManager[] = [];

    public newRoll: boolean = true;
    public rollsLeft: number = 2;
    public players: number = 1;    // array of Player objects
    public currentPlayer: number = 0;  // reference to current player in players array
    public playersGamesCompleted: number = 0;
    public gameType: GameMode = GameMode.SinglePlayer;

    private _state: GameState = GameState.MainMenu;
    private stateChangeCallbacks: Array<(newState: GameState, oldState: GameState) => void> = [];

    constructor() {
        this.diceManager = new DiceManager();
    }

    get state(): GameState {
        return this._state;
    }

    set state(newState: GameState) {
        var oldState = this._state;
        this._state = newState;
        this.notifyStateChange(newState, oldState);
    }

    onStateChange(callback: (newState: GameState, oldState: GameState) => void) {
        this.stateChangeCallbacks.push(callback);
    }

    private notifyStateChange(newState: GameState, oldState: GameState) {
        this.stateChangeCallbacks.forEach(callback => callback(newState, oldState));
    }

    dice(): Die[] {
        // In online multiplayer, always return current dice state
        if (this.gameType === GameMode.OnlineMultiPlayer) {
            return this.diceManager.getDice();
        }
        // For single player and local multiplayer, handle newRoll reset
        if(this.newRoll){
            return this.diceManager.resetDice();
        }
        return this.diceManager.getDice();
    }

    forceDiceReset(){
        this.diceManager.resetDice();
    }

    startNewGame(players: number = 1) {
        this.players = players;
        this.scoreManager = Array.from({length: players}, () => new ScoreManager());
        this.currentPlayer = 0;
        this.playersGamesCompleted = 0;
        this.newRoll = true;
        this.initializeScorecard();
        this.state = GameState.Playing;
    }

    initializeDice() {
        this.diceManager = new DiceManager();
    }

    initializeScorecard() {
        this.scoreManager.forEach(scoreManager => {
            scoreManager.initializeScorecard();
        });
    }

    setGameOver(){
        this.state = GameState.GameOver;
    }

    isGameOver(): Boolean {

        if(this.playersGamesCompleted >= this.players){
            this.setGameOver();
            return true;
        }
        const currentScoreManager = this.scoreManager[this.currentPlayer];

        if(currentScoreManager.isGameOver){
            return true;
        }

        if(currentScoreManager.getRemainingCategories() === 0){
            currentScoreManager.setGameOver(true);
            this.playersGamesCompleted++;
            return true;
        }

        // check to see if the last category is just the top bonus
        // this needs a better implementation. once topbonus is removed, this can be removed.
        if(currentScoreManager.getRemainingCategories() === 1 && !currentScoreManager.isCategorySelected(Categories.TopBonus)){
            this.calculateAllScores();
            currentScoreManager.setGameOver(true);
            this.playersGamesCompleted++;
            return true;
        }

        return false;
    }

    startNewRoll(){
        if(!this.isGameOver()){
            this.rollsLeft = 2;
            this.diceManager.resetDice();
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
        return this.scoreManager[this.currentPlayer].calculateScore(category, this.diceManager.getDice());
    }
    calculateAllScores() {
        for (const category in Categories) {
            if (isNaN(Number(category))) { // Ensure it's a string key, not a numeric index
                const score = this.calculateScore(Categories[category as keyof typeof Categories]);
                this.scoreManager[this.currentPlayer].updateScorecard(Categories[category as keyof typeof Categories], score);
            }
        }
    }
    // update the actual player score based on the selected category
    updateSelectedScore(category: Categories, score: number, roll: boolean = true){ 

        // exception for yahtzee
        if(category === Categories.Yahtzee && score > 50){
            this.scoreManager[this.currentPlayer].updateScorecard(category, score, true);
        }
        if(this.scoreManager[this.currentPlayer].isCategorySelected(category)){
            return;
        }
        this.scoreManager[this.currentPlayer].updateScorecard(category, score, true);
        
        this.isGameOver();

        if(roll){
            this.nextPlayer(); 
            this.newRoll = true;
        }
    }

    isCategorySelected(category: Categories): boolean {
        return this.scoreManager[this.currentPlayer].isCategorySelected(category);
    }

    getScoreByCategory(category: Categories): number {
        return this.scoreManager[this.currentPlayer].getScoreByCategory(category) || 0;
    }

    getTotalTopScore(): number {
        return this.scoreManager[this.currentPlayer].isUpperScoreBonusApplicable();
    }

    getTotalScore(): number {
        return this.scoreManager[this.currentPlayer].getTotalScore();
    }

    setGameMode(mode: GameMode): void {
        this.gameType = mode;
    }

    setPlayers(num: number): void {
        this.players = num;
    }

    getPlayerCount(): number {
        return this.players;
    }

    nextPlayer(){
        this.currentPlayer++;
        if(this.currentPlayer >= this.players){
            this.currentPlayer = 0;
        }
    }

    getPlayerScore(player: number): number {
        return this.scoreManager[player].getTotalScore();
    }

    selectCategory(category: Categories) {
        const score = this.calculateScore(category);
        this.updateSelectedScore(category, score);
    }

    updateFromState(stateData: GameStateData): void {
        console.log('Updating game state:', stateData);
        
        // Update dice state
        if (stateData.dice) {
            console.log('Updating dice:', stateData.dice);
            if(stateData.newRoll){
                console.log('Resetting dice');
                this.diceManager.resetDice();
            }else{
                this.diceManager.setDice(stateData.dice);
            }
        }

        // Update rolls left and newRoll state
        this.rollsLeft = stateData.rollsLeft;
        this.newRoll = stateData.newRoll;

        // Update current player
        this.currentPlayer = stateData.currentPlayer;

        // Update scores for all players
        if (stateData.scores) {
            console.log('Updating scores:', stateData.scores);
            stateData.scores.forEach((score, index) => {
                console.log(`Updating score for player ${index}:`, score);
                if (this.scoreManager[index]) {
                    this.scoreManager[index].setTotalScore(score);
                }
            });
        }

        // Update selected categories
        if (stateData.categories) {
            Object.entries(stateData.categories).forEach(([category, isSelected]) => {
                if (isSelected) {
                    const categoryEnum = Categories[category as keyof typeof Categories];
                    if (categoryEnum !== undefined) {
                        // Get the score for this category from the current dice
                        const score = this.calculateScore(categoryEnum);
                        this.scoreManager[this.currentPlayer].updateScorecard(categoryEnum, score, true);
                    }
                }
            });
        }

        console.log('Game state updated');
    }

    getGameState(): GameStateData {
        const scores = this.scoreManager.map(manager => manager.getTotalScore());
        console.log('Getting game state with scores:', scores);
        return {
            currentPlayer: this.currentPlayer,
            dice: this.diceManager.getDice(),
            rollsLeft: this.rollsLeft,
            scores: scores,
            categories: Object.entries(Categories)
                .filter(([key]) => isNaN(Number(key)))
                .reduce((acc, [key]) => {
                    acc[key] = this.scoreManager[this.currentPlayer].isCategorySelected(Categories[key as keyof typeof Categories]);
                    return acc;
                }, {} as { [key: string]: boolean }),
            newRoll: this.newRoll
        };
    }
}