import { Die } from '../types/Die';
import { Categories } from '../enums/Categories';
import { YahtzeeGame } from '../game';
import { GameState } from '../enums/GameState';
import { GameMode } from '../enums/GameMode';

const gameContainer = document.getElementById("game-container") as HTMLDivElement;
const gameModeContainer = document.getElementById("game-mode-container") as HTMLDivElement;
const gameOverContainer = document.getElementById("game-over-container") as HTMLDivElement;
const playerCountSelection = document.getElementById("player-count-selection") as HTMLDivElement;

const diceContainer = document.getElementById("dice-container") as HTMLDivElement;
const rollButton = document.getElementById("roll-button") as HTMLButtonElement;
const scoreButtons = document.querySelectorAll(".score-item");
const gameActionButtons = document.querySelectorAll(".game-mode-button");
const upperScore = document.getElementById("score-upper") as HTMLSpanElement;

const playersContainer = document.getElementById("players-container") as HTMLDivElement;

// Background music
let backgroundMusic: HTMLAudioElement;
const musicTracks = [
    '/music/bgsample.mp3',
    '/music/bgsample-2.mp3',
    '/music/bgsample-3.mp3',
    '/music/bgsample-4.mp3',
];

function initializeBackgroundMusic() {
    // Randomly select one track
    const randomTrack = musicTracks[Math.floor(Math.random() * musicTracks.length)];
    backgroundMusic = new Audio(randomTrack);
    backgroundMusic.loop = true;
    backgroundMusic.volume = 0.4; // 30% volume
    
    // Start playing on user interaction (to comply with browser autoplay policies)
    document.addEventListener('click', () => {
        if (backgroundMusic && backgroundMusic.paused) {
            backgroundMusic.play().catch(error => {
                console.log("Error playing background music:", error);
            });
        }
    }, { once: true }); // Remove listener after first click
}

function playDiceRollSound() {
    const audio = new Audio('/sounds/dice-roll-3.mp3');
    audio.play().catch(error => {
        console.log("Error playing sound:", error);
    });
}

function playScoreSound() {
    const audio = new Audio('/sounds/score.mp3');
    audio.play().catch(error => {
        console.log("Error playing sound:", error);
    });
}

function playNoScoreSound() {
    const audio = new Audio('/sounds/no-score.mp3');
    audio.play().catch(error => {
        console.log("Error playing sound:", error);
    });
}

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
    const iconElement = document.createElement("i");
    iconElement.classList.add("fas", "text-white");

    switch(value){
        case 1:
            iconElement.classList.add("fa-dice-one");
            break;
        case 2:
            iconElement.classList.add("fa-dice-two");
            break;
        case 3:
            iconElement.classList.add("fa-dice-three");
            break;
        case 4:
            iconElement.classList.add("fa-dice-four");
            break;
        case 5:
            iconElement.classList.add("fa-dice-five");
            break;
        case 6:
            iconElement.classList.add("fa-dice-six");
            break; 
    }

    el.appendChild(iconElement);
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
                if(score !== null && score > 0){
                    cell.classList.remove('no-score');
                }else{
                    cell.classList.add('no-score');
                }
            }else{
                cell.classList.remove('disabled');
                cell.classList.remove('no-score');
            }

            if(cellScore){
                cellScore.textContent = score !== null ? score.toString() : '-';
            }
        }
    });
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
        button.classList.remove('no-score');
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

function resetPlayersGrid(game: YahtzeeGame){
    playersContainer.classList.remove('grid-cols-1');
    playersContainer.classList.remove('grid-cols-2');
    playersContainer.classList.remove('grid-cols-3');
    playersContainer.classList.remove('grid-cols-4');
    playersContainer.classList.add('grid-cols-' + game.getPlayerCount());
}

function setupPlayersUI(game: YahtzeeGame){
    // change style to show grid for # of players
    if(game.gameType === GameMode.SinglePlayer){
        console.log("setting up single player mode");
        resetPlayersGrid(game);
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
        resetPlayersGrid(game);
        const players = playersContainer.querySelectorAll('.player-data');
        let playerCount = 0;
        players.forEach((player, index) => {
            let playerDiv = players[index] as HTMLDivElement;
            if(playerCount >= game.getPlayerCount()){   
                playerDiv.style.display = "none";
            }else{
                playerDiv.style.display = "block";
            }
            playerCount++;
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
    let playerCount = 0;
    players.forEach((el, index) => {
        if(playerCount >= game.getPlayerCount()){
            return;
        }
        let playerDiv = players[index] as HTMLDivElement;
        // update points
        let playerScoreDiv = playerDiv.querySelector('span.player-score');
        if(playerScoreDiv){
            playerScoreDiv.textContent = game.getPlayerScore(index).toString();
            playerCount++;
        }
    });
}

function getWinningPlayer(game: YahtzeeGame): { player: number; score: number } {
    let winningPlayer = 0;
    let highestScore = game.getPlayerScore(0);

    for (let i = 1; i < game.getPlayerCount(); i++) {
        const playerScore = game.getPlayerScore(i);
        if (playerScore > highestScore) {
            highestScore = playerScore;
            winningPlayer = i;
        }
    }

    return { player: winningPlayer, score: highestScore };
}

function updateFinalScorecard(game: YahtzeeGame, playerIndex: number) {
    const finalScorecard = document.getElementById("final-scorecard");
    if (!finalScorecard) return;

    // Update upper score
    const finalUpperScore = document.getElementById("final-upper-score");
    if (finalUpperScore) {
        finalUpperScore.textContent = game.getTotalTopScore().toString();
    }

    // Update all score cells
    document.querySelectorAll('#final-scorecard .score-item').forEach(cell => {
        const category = cell.getAttribute('data-category') as Categories;
        if (category != null) {
            const score = game.getScoreByCategory(category);
            const cellScore = cell.querySelector('.score-cell');
            if (cellScore) {
                cellScore.textContent = score !== null ? score.toString() : '-';
            }
        }
    });

    // save the game stats to local storage
    saveGameStats(game);
}


function saveGameStats(game: YahtzeeGame) {
    const stats = {
        gameType: game.gameType,
        players: game.scoreManager.map((scoreManager, index) => ({
            name: `Player ${index + 1}`,
            score: scoreManager.getTotalScore(),
            scoreCard: scoreManager.getScorecard()
        })),
        date: new Date().toISOString()
    };

    if (!localStorage.getItem('yahtzeeStats')) {
        // If it doesn't exist, initialize it with an empty array
        console.log("no stats found, initializing");
        localStorage.setItem('yahtzeeStats', JSON.stringify([]));
    }

    // Get existing stats from localStorage
    const existingStats = JSON.parse(localStorage.getItem('yahtzeeStats') || '[]');
    existingStats.push(stats);

    // Save updated stats back to localStorage
    localStorage.setItem('yahtzeeStats', JSON.stringify(existingStats));
    console.log("stats saved");
}

function displayGameStats() {
    const stats = JSON.parse(localStorage.getItem('yahtzeeStats') || '[]');
    stats.forEach((gameStat: any, index: number) => {
        console.log(`Game ${index + 1}:`);
        console.log(`Game Type: ${gameStat.gameType}`);
        gameStat.players.forEach((player: any) => {
            console.log(`${player.name}: ${player.score} points`);
            console.log(`Score Card:`, player.scoreCard);
        });
        console.log(`Date: ${gameStat.date}`);
    });
}


/* action listeners */
function initializeEventListeners(game: YahtzeeGame) {
    rollButton.addEventListener("click", () => {
        if(game.rollsLeft === 0){
            return;
        }
        playDiceRollSound();
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
                if(scoreValue > 0){
                    playScoreSound();
                }else{
                    playNoScoreSound();
                    button.classList.add('no-score');
                }
                game.updateSelectedScore(scoreType, scoreValue);
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
                game.startNewGame(1);
                setupPlayersUI(game);
                gameContainer.style.display = "block";
                gameModeContainer.style.display = "none";
                renderDice(game, game.dice());
            }

            if(action === 'mp'){
                // Show player count selection
                playerCountSelection.classList.remove('hidden');
                playerCountSelection.classList.add('visible');
            }

            if(action === 'MainMenu'){
                game.state = GameState.MainMenu;
            }
        });
    });

    // Add event listeners for player count buttons
    const playerCountButtons = document.querySelectorAll('.player-count-button');
    playerCountButtons.forEach(button => {
        button.addEventListener('click', () => {
            const playerCount = parseInt(button.getAttribute('data-count') || '2');
            game.setGameMode(GameMode.MultiPlayer);
            game.startNewGame(playerCount);
            setupPlayersUI(game);
            updatePlayerScore(game);
            gameContainer.style.display = "block";
            gameModeContainer.style.display = "none";
            renderDice(game, game.dice());
        });
    });

    game.onStateChange((newState, oldState) => {
        console.log(`Game state changed from: ${oldState} to: ${newState}`);
        if(oldState === newState){
            return;
        }
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
                
                const gameOverMessage = document.getElementById("game-over-message") as HTMLParagraphElement;
                if (game.gameType === GameMode.MultiPlayer) {
                    const winner = getWinningPlayer(game);
                    gameOverMessage.innerHTML = `Player ${winner.player + 1} wins with <span class="final-score">${winner.score}</span> points!`;
                    updateFinalScorecard(game, winner.player);
                } else {
                    gameOverMessage.innerHTML = `You scored <span class="final-score">${game.getTotalScore()}</span> points!`;
                    updateFinalScorecard(game, 0);
                }
                break;
        }
    });

    // Initial render
    run();
}

export function initializeUI(game: YahtzeeGame) {
    initializeBackgroundMusic();
    initializeEventListeners(game);
}