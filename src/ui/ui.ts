import { Die } from '../types/Die';
import { Categories } from '../enums/Categories';
import { YahtzeeGame } from '../game';
import { GameState } from '../enums/GameState.js';
import { GameMode } from '../enums/GameMode.js';

const gameContainer = document.getElementById("game-container") as HTMLDivElement;
const gameModeContainer = document.getElementById("game-mode-container") as HTMLDivElement;
const gameOverContainer = document.getElementById("game-over-container") as HTMLDivElement;

const diceContainer = document.getElementById("dice-container") as HTMLDivElement;
const rollButton = document.getElementById("roll-button") as HTMLButtonElement;
const scoreButtons = document.querySelectorAll(".score-item");
const gameActionButtons = document.querySelectorAll(".game-mode-button");
const totalScore = document.getElementById("player-score") as HTMLDivElement;
const upperScore = document.getElementById("score-upper") as HTMLSpanElement;

const playersContainer = document.getElementById("players-container") as HTMLDivElement;

function run() {
    gameContainer.style.display = "none"; 
    gameOverContainer.style.display = "none"; 
}

function renderDice(game: YahtzeeGame, dice: Die[]) {
    diceContainer.innerHTML = "";
    dice.forEach((die, index) => {
        const dieElement = document.createElement("div");
        setDieIcon(dieElement, die.value);
        dieElement.classList.add("die");
        setDieColor(dieElement, die.color);
        if (die.held) dieElement.classList.add("held");

        dieElement.addEventListener("click", () => {
            game.toggleHold(index);
            renderDice(game, game.dice());
        });

        diceContainer.appendChild(dieElement);
    });

    updateScoreboard(game);
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

function updateScoreboard(game: YahtzeeGame) {
    game.calculateAllScores();
    document.querySelectorAll('.score-item').forEach(cell => {
        const category = cell.getAttribute('data-category') as Categories;
        if (category != null) {
            const score = game.getScoreByCategory(category);
            const cellScore = cell.querySelector('.score-cell');
            const selected = game.isCategorySelected(category);
            if(selected){
                cell.classList.add('disabled');
            }else{
                cell.classList.remove('disabled');
            }

            if(cellScore){
                cellScore.textContent = score !== null ? score.toString() : '-';
            }
        }
    });
    //totalScore.textContent = game.getTotalScore().toString();
    updatePlayerScore(game);
    upperScore.textContent = game.getTotalTopScore().toString();

    if(game.isGameOver()){
        rollButton.textContent = `Game Over`;
        rollButton.disabled = true;
    }
}

function updateDice(game: YahtzeeGame) {
    if(!game.isGameOver()){
        animateDice();
        setTimeout(() => {
            renderDice(game, game.dice());
            updateScoreboard(game);
            rollButton.textContent = `Roll Dice (${game.rollsLeft})`;
        }, 500); // Match the duration of the CSS animation
    }else{
        rollButton.textContent = `Game Over`;
    }
}

function setupUI(game: YahtzeeGame){
    scoreButtons.forEach((button) => {
        button.classList.remove('selected');
    });
    rollButton.textContent = `Roll Dice (${game.rollsLeft})`;
    rollButton.disabled = false;
}

function resetDiceUI(game: YahtzeeGame){
    game.dice().forEach(die => {
        die.held = false;
    });
    renderDice(game, game.dice());
}

function setupPlayersUI(game: YahtzeeGame){
    // change style to show grid for # of players
    if(game.gameType === GameMode.SinglePlayer){
        console.log("setting up single player mode");
        playersContainer.classList.remove('grid-cols-4');
        playersContainer.classList.add('grid-cols-1');
        // hide players 2-4
        const players = playersContainer.querySelectorAll('.player-data');
        players.forEach((player, index) => {
            if(index > 0){
                let player = players[index] as HTMLDivElement;
                player.style.display = "none";
            }
        });
    }

    if(game.gameType === GameMode.MultiPlayer){
        console.log("setting up multi player mode");
        playersContainer.classList.remove('grid-cols-1');
        playersContainer.classList.add('grid-cols-4');
        const players = playersContainer.querySelectorAll('.player-data');
        players.forEach((player, index) => {
            let playerDiv = players[index] as HTMLDivElement;
            playerDiv.style.display = "block";
        });
    }
}

function changePlayer(game: YahtzeeGame){
    const players = playersContainer.querySelectorAll('.player-data');
    players.forEach((player, index) => {
        let playerDiv = players[index] as HTMLDivElement;
        if(index === game.currentPlayer){
            playerDiv.classList.add('active');
        }else{
            playerDiv.classList.remove('active');
        }

        // reload the scorecard.
        setupUI(game);

    });
}

function updatePlayerScore(game: YahtzeeGame){
    const players = playersContainer.querySelectorAll('.player-data');
    players.forEach((el, index) => {
        let playerDiv = players[index] as HTMLDivElement;
        // update points
        let playerScoreDiv = playerDiv.querySelector('span.player-score');
        if(playerScoreDiv){
            playerScoreDiv.textContent = game.getPlayerScore(index).toString();
        }
    });
}

/* action listeners */
function initializeEventListeners(game: YahtzeeGame) {
    rollButton.addEventListener("click", () => {
        if(game.rollsLeft === 0){
            return;
        }
        game.rollDice();
        updateDice(game);
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
                //updatePlayerScore(game);
                resetDiceUI(game);
                updateDice(game);

                if(game.gameType === GameMode.MultiPlayer){
                    updatePlayerScore(game);
                    changePlayer(game);
                }
            } else {
                console.error('Score type not found on button.');
            }
        });
    });

    gameActionButtons.forEach((button) => {
        button.addEventListener("click", () => {

            const action = button.getAttribute("data-mode");

            if (action === 'sp') {
                game.setGameMode(GameMode.SinglePlayer);
                //game.setPlayers(1);
                game.startNewGame(1);
                setupPlayersUI(game);
                gameContainer.style.display = "block";
                gameModeContainer.style.display = "none";
                renderDice(game, game.dice());
            }

            if(action === 'mp'){
                game.setGameMode(GameMode.MultiPlayer);
                //game.setPlayers(4);
                game.startNewGame(4);
                setupPlayersUI(game);
                updatePlayerScore(game);
                gameContainer.style.display = "block";
                gameModeContainer.style.display = "none";
                renderDice(game, game.dice());
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
                setupUI(game);
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
}

export function initializeUI(game: YahtzeeGame) {
    initializeEventListeners(game);
}