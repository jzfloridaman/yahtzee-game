import { defineStore } from 'pinia'
import { YahtzeeGame } from '../game'
import { GameMode } from '../enums/GameMode'

export const useGameStore = defineStore('game', {
  state: () => ({
    game: null as YahtzeeGame | null,
    gameMode: null as GameMode | null,
    isGameActive: false,
  }),

  getters: {
    currentGame: (state) => state.game,
    currentGameMode: (state) => state.gameMode,
    gameIsActive: (state) => state.isGameActive,
  },

  actions: {
    initializeGame(mode: GameMode) {
      this.game = new YahtzeeGame(mode)
      this.gameMode = mode
      this.isGameActive = true
    },

    endGame() {
      this.game = null
      this.gameMode = null
      this.isGameActive = false
    },

    // You can add more actions here as needed
    // For example:
    // - rollDice()
    // - toggleHold(index)
    // - selectCategory(category)
    // etc.
  },
}) 