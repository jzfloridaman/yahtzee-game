import { Die } from './types/Die';
import { Categories } from './enums/Categories';
import { DiceManager } from './managers/DiceManager';
import { ScoreManager } from './managers/ScoreManager';
import { GameState } from './enums/GameState';
import { GameMode } from './enums/GameMode';
import { Player } from './models/Player';
import { CategoryGroup } from './enums/CategoryGroup';

interface GameStateData {
  currentPlayer: number;
  dice: Die[];
  rollsLeft: number;
  scores: number[];
  scorecard: { [key: string]: { value: number | null; selected: boolean; group: CategoryGroup } };
  newRoll: boolean;
  selectedCategories?: Categories[];
  isGameOver: Boolean;
  playersGamesCompleted: number;
}

// Game state
export class YahtzeeGame {

    private diceManager: DiceManager;
    public players: Player[] = [];

    public newRoll: boolean = true;
    public rollsLeft: number = 2;
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
        this.players = Array.from({length: players}, (_, i) => new Player(`Player ${i+1}`));
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
        this.players.forEach(player => {
            player.initializeScorecard();
        });
    }

    setGameOver(){
        console.log('Setting game over');
        this.state = GameState.GameOver;
    }

    isGameOver(): Boolean {
        //console.log('Checking if game is over');

        if(this.playersGamesCompleted >= this.players.length){
            console.log('Game over, all players have completed their games');
            this.setGameOver();
            return true;
        }
        const currentPlayer = this.players[this.currentPlayer];

        if(currentPlayer.isGameOver){
            return true;
        }

        if(currentPlayer.getRemainingCategories() === 0){
            currentPlayer.setGameOver(true);
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
        return this.players[this.currentPlayer].calculateScore(category, this.diceManager.getDice());
    }
    calculateAllScores() {
        for (const category in Categories) {
            if (isNaN(Number(category))) { // Ensure it's a string key, not a numeric index
                const score = this.calculateScore(Categories[category as keyof typeof Categories]);
                this.players[this.currentPlayer].updateScorecard(Categories[category as keyof typeof Categories], score);
            }
        }
    }
    // update the actual player score based on the selected category
    updateSelectedScore(category: Categories, score: number, roll: boolean = true){ 

        // exception for yahtzee
        if(category === Categories.Yahtzee && score > 50){
            this.players[this.currentPlayer].updateScorecard(category, score, true);
        }
        if(this.players[this.currentPlayer].isCategorySelected(category)){
            return;
        }
        this.players[this.currentPlayer].updateScorecard(category, score, true);
        
        this.isGameOver();

        if(roll){
            this.nextPlayer(); 
            this.newRoll = true;
        }
    }

    isCategorySelected(category: Categories): boolean {
        return this.players[this.currentPlayer].isCategorySelected(category);
    }

    getScoreByCategory(category: Categories): number {
        return this.players[this.currentPlayer].getScoreByCategory(category) || 0;
    }

    getTotalTopScore(): number {
        // This should berefactored to use the player scorecard
        // Return the sum of upper section values for the current player
        const upperSectionCategories = [
            Categories.Ones,
            Categories.Twos,
            Categories.Threes,
            Categories.Fours,
            Categories.Fives,
            Categories.Sixes
        ];
        const scorecard = this.players[this.currentPlayer].getScorecard();
        return upperSectionCategories.reduce((sum, category) => {
            const entry = scorecard[category];
            if(entry.selected && entry.value !== null){
                return sum + entry.value;
            }
            return sum;
        }, 0);
    }

    getTotalScore(): number {
        return this.players[this.currentPlayer].getTotalScore();
    }

    setGameMode(mode: GameMode): void {
        this.gameType = mode;
    }

    setPlayers(num: number): void {
        // this.players = num; // now handled by players[]
    }

    getPlayerCount(): number {
        return this.players.length;
    }

    nextPlayer(){
        this.currentPlayer = (this.currentPlayer + 1) % this.players.length;
    }

    getPlayerScore(player: number): number {
        return this.players[player].getTotalScore();
    }

    selectCategory(category: Categories) {
        if (this.players[this.currentPlayer]) {
            this.players[this.currentPlayer].selectCategory(category);
        }
    }

    updateFromState(stateData: GameStateData): void {
        //console.log('Updating game state:', stateData);
        // Update dice state
        if (stateData.dice) {
            //console.log('Updating dice:', stateData.dice);
            if(stateData.newRoll){
                //console.log('Resetting dice');
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
            //console.log('Updating scores:', stateData.scores);
            stateData.scores.forEach((score, index) => {
                //console.log(`Updating score for player ${index}:`, score);
                if (this.players[index]) {
                    this.players[index].setTotalScore(score);
                }
            });
        }
        // Update scorecard for the current player
        if (stateData.scorecard) {
            const player = this.players[this.currentPlayer];
            const scorecard = player.getScorecard();
            Object.entries(stateData.scorecard).forEach(([category, entry]) => {
                if (scorecard[category as Categories]) {
                    scorecard[category as Categories].value = entry.value;
                    scorecard[category as Categories].selected = entry.selected;
                    if ('group' in entry) {
                        scorecard[category as Categories].group = entry.group as CategoryGroup;
                    }
                }
            });
        }

        if(stateData.isGameOver){
            console.log('Setting game over');
            this.setGameOver();
            
        }
        console.log('Game state updated');
    }

    getGameState(): GameStateData {

        // might need to refactor this to get the scorecard for each player

        const scores = this.players.map(player => player.getTotalScore());
        console.log('Getting game state with scores:', scores);
        return {
            currentPlayer: this.currentPlayer,
            dice: this.diceManager.getDice(),
            rollsLeft: this.rollsLeft,
            scores: scores,
            scorecard: this.players[this.currentPlayer].getScorecard(),
            newRoll: this.newRoll,
            isGameOver: this.isGameOver(),
            playersGamesCompleted: this.playersGamesCompleted
        };
    }
}