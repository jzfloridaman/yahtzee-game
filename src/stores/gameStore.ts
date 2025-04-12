import { defineStore } from 'pinia'
import { YahtzeeGame } from '../game'
import { GameMode } from '../enums/GameMode'

interface GameHistory {
  date: string
  mode: GameMode
  players: number
  scores: number[]
}

export const useGameStore = defineStore('game', {
  state: () => ({
    game: null as YahtzeeGame | null,
    gameMode: null as GameMode | null,
    isGameActive: false,
    // Audio settings
    bgmEnabled: localStorage.getItem('bgmEnabled') === 'true',
    sfxEnabled: localStorage.getItem('sfxEnabled') === 'true',
    // UI state
    showAudioSettings: false,
    showGameHistory: false,
    showGameOptions: false,
    // Game history
    gameHistory: [] as GameHistory[],
  }),

  getters: {
    currentGame: (state) => state.game,
    currentGameMode: (state) => state.gameMode,
    gameIsActive: (state) => state.isGameActive,
    audioSettings: (state) => ({
      bgmEnabled: state.bgmEnabled,
      sfxEnabled: state.sfxEnabled
    }),
  },

  actions: {
    initializeGame(mode: GameMode) {
      this.game = new YahtzeeGame()
      this.game.setGameMode(mode)
      this.gameMode = mode
      this.isGameActive = true
      
      // Initialize the game with default player count based on mode
      const playerCount = mode === GameMode.SinglePlayer ? 1 : 2
      this.game.setPlayers(playerCount)
      this.game.startNewGame(playerCount)
    },

    endGame() {
      if (this.game) {
        // Save game to history
        this.gameHistory.push({
          date: new Date().toISOString(),
          mode: this.gameMode!,
          players: this.game.getPlayerCount(),
          scores: Array.from({ length: this.game.getPlayerCount() }, (_, i) => 
            this.game!.getPlayerScore(i)
          )
        })
      }
      this.game = null
      this.gameMode = null
      this.isGameActive = false
    },

    // Audio settings
    toggleAudioSettings() {
      this.showAudioSettings = !this.showAudioSettings
    },

    toggleGameHistory() {
      this.showGameHistory = !this.showGameHistory
    },

    toggleGameOptions() {
      this.showGameOptions = !this.showGameOptions
    },

    setBgmEnabled(enabled: boolean) {
      this.bgmEnabled = enabled
      localStorage.setItem('bgmEnabled', enabled.toString())
    },

    setSfxEnabled(enabled: boolean) {
      this.sfxEnabled = enabled
      localStorage.setItem('sfxEnabled', enabled.toString())
    },

    // Game actions
    restartGame() {
      if (this.game) {
        const playerCount = this.game.getPlayerCount()
        this.game.startNewGame(playerCount)
      }
    },

    newGame() {
      this.endGame()
    },

    rollDice() {
      console.log('rollDice in store');
      if(!this.game){
        console.log('no game');
        return;
      }

      if(this.game.rollsLeft === 0 && !this.game.newRoll){
        return;
      }
    
      if(this.game.newRoll){   
          //rollButton.innerHTML = generateRollButtonText(game.rollsLeft, game.newRoll);
          this.game.newRoll = false;
          this.game.startNewRoll();
          //playDiceRollSound();
          this.game.rollDice();
          this.game.rollsLeft = 2;
          //updateDice(game);
      }else{
          //playDiceRollSound();
          this.game.rollDice();
          //updateDice(game);
      }



    },
    // You can add more actions here as needed
    // For example:
    // - rollDice()
    // - toggleHold(index)
    // - selectCategory(category)
    // etc.
  },
}) 