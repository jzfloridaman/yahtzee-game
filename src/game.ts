import { Die } from './types/Die';
import { Categories } from './enums/Categories';
import { DiceManager } from './managers/DiceManager';
import { ScoreManager } from './managers/ScoreManager';
import { GameState } from './enums/GameState';
import { GameMode } from './enums/GameMode';
import { ComputerPlayer } from './ai/ComputerPlayer';
import { initializeUI } from './ui/ui';

// Game state
export class YahtzeeGame {

    private diceManager: DiceManager;
    public scoreManager: ScoreManager[] = [];
    private computerPlayers: ComputerPlayer[] = [];

    newRoll: boolean = true;
    rollsLeft: number = 2;
    players: number = 1;    // array of Player objects
    currentPlayer: number = 0;  // reference to current player in players array
    gameType: GameMode = GameMode.SinglePlayer;

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
        if(this.newRoll){
            this.diceManager.resetDice();
            this.diceManager.rollDice();
            this.newRoll = false;
        }
        return this.diceManager.getDice();
    }

    startNewGame(players: number = 1, computerOpponents: number = 0) {
        console.log(`Starting new game with ${players} human players and ${computerOpponents} computer players`);
        this.players = players;
        this.scoreManager = Array.from({length: this.players + computerOpponents}, () => new ScoreManager());
        this.computerPlayers = Array.from({length: computerOpponents}, (_, i) => 
            new ComputerPlayer(this.scoreManager[players + i])
        );
        console.log(`Total players: ${this.players + computerOpponents}, Computer players: ${this.computerPlayers.length}`);
        this.currentPlayer = 0;
        this.newRoll = true;
        this.rollsLeft = 2;
        this.diceManager.resetDice();
        this.initializeScorecard();
        this.state = GameState.Playing;
        
        // Log initial state
        this.logPlayerStates();
    }

    logPlayerStates() {
        console.log('Current Game State:');
        console.log(`Current Player: ${this.currentPlayer}`);
        console.log(`Is Computer Player: ${this.isComputerPlayer()}`);
        console.log('Player Scorecards:');
        this.scoreManager.forEach((manager, index) => {
            console.log(`Player ${index + 1} (${index >= this.players ? 'Computer' : 'Human'}):`);
            console.log('- Total Score:', manager.getTotalScore());
            console.log('- Upper Score:', manager.isUpperScoreBonusApplicable());
            console.log('- Scorecard:', manager.getScorecard());
        });
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
        console.log('Checking if game is over...');
        // Check if all players have completed their scorecards
        for (let i = 0; i < this.scoreManager.length; i++) {
            const playerScoreManager = this.scoreManager[i];
            const remaining = playerScoreManager.getRemainingCategories();
            console.log(`Player ${i + 1} remaining categories:`, remaining);
            
            if (remaining > 1) {
                console.log('Game not over: Player', i + 1, 'has more than 1 category remaining');
                return false;
            }
            
            // If a player has only one category left, check if it's the top bonus
            if (remaining === 1 && !playerScoreManager.isCategorySelected(Categories.TopBonus)) {
                console.log('Game not over: Player', i + 1, 'has 1 non-bonus category remaining');
                return false;
            }
        }
        
        console.log('Game is over: All players have completed their scorecards');
        this.setGameOver();
        return true;
    }

    startNewRoll(){
        if(!this.newRoll && !this.isGameOver()){
            // if multiplayer, switch to next player, load/save data
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
    updateSelectedScore(category: Categories, score: number, roll: boolean = true) {
        console.log(`Updating score for player ${this.currentPlayer + 1}:`);
        console.log('- Category:', Categories[category]);
        console.log('- Score:', score);
        
        if(category === Categories.Yahtzee && score > 50){
            this.scoreManager[this.currentPlayer].updateScorecard(category, score, true);
        }
        if(this.scoreManager[this.currentPlayer].isCategorySelected(category)){
            return;
        }
        this.scoreManager[this.currentPlayer].updateScorecard(category, score, true);
        
        // Log state after update
        this.logPlayerStates();
        
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
        return this.players + this.computerPlayers.length;
    }

    getComputerPlayerCount(): number {
        return this.computerPlayers.length;
    }

    getPlayerScore(player: number): number {
        if (player >= 0 && player < this.scoreManager.length) {
            return this.scoreManager[player].getTotalScore();
        }
        return 0;
    }

    nextPlayer() {
        console.log(`Moving from player ${this.currentPlayer} to next player`);
        this.currentPlayer++;
        if(this.currentPlayer >= this.players + this.computerPlayers.length){
            this.currentPlayer = 0;
        }
        console.log(`Now it's player ${this.currentPlayer}'s turn`);
        this.rollsLeft = 2;
        this.newRoll = true;
        this.diceManager.resetDice();
        this.logPlayerStates();
    }

    isComputerPlayer(): boolean {
        const isComputer = this.computerPlayers.length > 0 && this.currentPlayer >= this.players;
        console.log(`Checking if computer player: currentPlayer=${this.currentPlayer}, totalPlayers=${this.players}, isComputer=${isComputer}`);
        return isComputer;
    }

    async playComputerTurn() {
        if (!this.isComputerPlayer()) {
            console.log('Not a computer player turn');
            return;
        }

        console.log('Starting computer player turn...');
        const computerIndex = this.currentPlayer - this.players;
        const computer = this.computerPlayers[computerIndex];
        console.log(`Computer player ${computerIndex + 1} taking turn (index ${computerIndex})`);

        // Initialize dice for computer's turn
        this.newRoll = true;
        this.rollsLeft = 2;
        this.diceManager.resetDice();
        this.diceManager.rollDice(); // First roll
        console.log('Initial dice roll:', this.diceManager.getDice().map(d => d.value));

        // Computer's turn logic
        while (this.rollsLeft > 0) {
            console.log(`Computer roll ${3 - this.rollsLeft} of 3`);
            const currentDice = this.diceManager.getDice();
            console.log('Current dice:', currentDice.map(d => d.value));
            
            // Decide which dice to hold
            const holds = computer.shouldHoldDice(currentDice, this.rollsLeft);
            holds.forEach((shouldHold, index) => {
                if (shouldHold) {
                    this.toggleHold(index);
                }
            });
            console.log('Held dice:', currentDice.filter(d => d.held).map(d => d.value));
            
            // Roll unheld dice
            this.diceManager.rollDice();
            console.log('After roll:', this.diceManager.getDice().map(d => d.value));
            this.rollsLeft--;
            
            // Wait a bit between rolls for visual effect
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Choose and score category
        const finalDice = this.diceManager.getDice();
        const category = computer.chooseCategory(finalDice);
        const score = this.calculateScore(category);
        console.log(`Computer scoring ${score} points in ${Categories[category]}`);
        
        // Update only the computer's scorecard
        this.scoreManager[this.currentPlayer].updateScorecard(category, score, true);
        
        // Move to next player
        this.nextPlayer();
        console.log('Computer turn complete');
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