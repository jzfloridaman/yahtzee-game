import { Die } from './types/Die.js';
import { Categories } from './enums/Categories.js';
import { DiceManager } from './managers/DiceManager.js';
import { ScoreManager } from './managers/ScoreManager.js';
import { GameState } from './enums/GameState.js';
import { GameMode } from './enums/GameMode.js';

// Game state
class YahtzeeGame {

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

const gameContainer = document.getElementById("game-container") as HTMLDivElement;
const gameModeContainer = document.getElementById("game-mode-container") as HTMLDivElement;
const gameOverContainer = document.getElementById("game-over-container") as HTMLDivElement;

const diceContainer = document.getElementById("dice-container") as HTMLDivElement;
const rollButton = document.getElementById("roll-button") as HTMLButtonElement;
const scoreButtons = document.querySelectorAll(".score-item");
const gameActionButtons = document.querySelectorAll(".game-mode-button");
const totalScore = document.getElementById("player-score") as HTMLDivElement;


function run(){
    gameContainer.style.display = "none"; 
    gameOverContainer.style.display = "none"; 
}


function renderDice(dice: Die[]) {
    diceContainer.innerHTML = "";
    dice.forEach((die, index) => {
        const dieElement = document.createElement("div");
        setDieIcon(dieElement, die.value);
        dieElement.classList.add("die");
        setDieColor(dieElement, die.color);
        if (die.held) dieElement.classList.add("held");

        dieElement.addEventListener("click", () => {
            game.toggleHold(index);
            renderDice(game.dice());
        });

        diceContainer.appendChild(dieElement);
    });

    updateScoreboard();
}

function animateDice() {
    const diceElements = document.querySelectorAll(".die");
    diceElements.forEach(die => {
        die.classList.add("roll");
        die.addEventListener("animationend", () => {
            die.classList.remove("roll");
        }, { once: true });
    });
}

function setDieColor(el: HTMLDivElement, color: string) {
    el.classList.remove('red', 'green', 'blue');
    el.classList.add(color);
}

function setDieIcon(el: HTMLDivElement, value: number) {

    el.innerHTML = ""; // Clear any existing content
    const icon = document.createElement("i");
    icon.classList.add("fas", "text-white");

    switch(value){
        case 1:
            icon.classList.add("fa-dice-one");
            break;
        case 2:
            icon.classList.add("fa-dice-two");
            break;
        case 3:
            icon.classList.add("fa-dice-three");
            break;
        case 4:
            icon.classList.add("fa-dice-four");
            break;
        case 5:
            icon.classList.add("fa-dice-five");
            break;
        case 6:
            icon.classList.add("fa-dice-six");
            break; 
    }

    el.appendChild(icon);
}

function updateScoreboard() {
    game.calculateAllScores();
    document.querySelectorAll('.score-item').forEach(cell => {
        const category = cell.getAttribute('data-category') as Categories;
        if (category != null) {
            const score = game.getScoreByCategory(category);
            const cellScore = cell.querySelector('.score-cell');
            if(cellScore){
                cellScore.textContent = score !== null ? score.toString() : '-';
            }
        }
    });
    totalScore.textContent = game.getTotalScore().toString();

    if(game.isGameOver()){
        rollButton.textContent = `Game Over`;
        rollButton.disabled = true;
    }
}

function updateDice() {
    if(!game.isGameOver()){
        animateDice();
        setTimeout(() => {
            renderDice(game.dice());
            updateScoreboard();
            rollButton.textContent = `Roll Dice (${game.rollsLeft})`;
        }, 500); // Match the duration of the CSS animation
    }else{
        rollButton.textContent = `Game Over`;
    }
}

function setupUI(){
    scoreButtons.forEach((button) => {
        button.classList.remove('selected');
    });
    rollButton.textContent = `Roll Dice (${game.rollsLeft})`;
    rollButton.disabled = false;
}
function resetDiceUI(){
    game.dice().forEach(die => {
        die.held = false;
    });
    renderDice(game.dice());
}


/* action listeners */
rollButton.addEventListener("click", () => {
    if(game.rollsLeft === 0){
        return;
    }
    game.rollDice();
    updateDice();
});

scoreButtons.forEach((button) => {
    button.addEventListener("click", () => {
        const scoreType = button.getAttribute("data-category") as Categories;
        if (scoreType && scoreType !== 'Top Bonus') {
            if(game.isCategorySelected(scoreType)){
                return;
            }
            button.classList.add('selected');
            const scoreValue = game.calculateScore(scoreType);
            game.updateSelectedScore(scoreType, scoreValue);
            resetDiceUI();
            updateDice();
        } else {
            console.error('Score type not found on button.');
        }
    });
});

gameActionButtons.forEach((button) => {
    button.addEventListener("click", () => {
        const action = button.getAttribute("data-mode");
        if (action === 'sp') {
            game.startNewGame();
            gameContainer.style.display = "block";
            gameModeContainer.style.display = "none";
            renderDice(game.dice());
        }

        if(action === 'MainMenu'){
            game.state = GameState.MainMenu;
        }
    });
});

game.onStateChange((newState) => {
    console.log(`Game state changed to: ${newState}`);
    switch(newState){
        case GameState.MainMenu:
            gameContainer.style.display = "none";
            gameOverContainer.style.display = "none";
            gameModeContainer.style.display = "block";
            break;
        case GameState.Playing:
            gameContainer.style.display = "block";
            gameModeContainer.style.display = "none";
            gameOverContainer.style.display = "none";
            setupUI();
            break;
        case GameState.GameOver:  
            gameOverContainer.style.display = "block";
            gameContainer.style.display = "none";
            gameModeContainer.style.display = "none";
            document.getElementsByClassName("final-score")[0].textContent = game.getTotalScore().toString();
            break;
    }
});

// Initial render
run();

/* 
    TODO: 
    - Add computer player
    - Add animations
    - Add sounds
    - abstract player specific logic to allow for multiplayer
*/