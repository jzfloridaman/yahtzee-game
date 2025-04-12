<template>
  <div>
    <!-- Audio Settings Menu -->
    <div class="fixed top-4 right-4 z-50 flex gap-2">
      <div class="relative">
        <button @click="gameStore.toggleAudioSettings" 
                class="bg-gray-800 p-3 rounded-lg shadow-lg hover:bg-gray-700 transition-colors duration-200">
          <i class="fas fa-volume-up text-white text-xl"></i>
        </button>
        <div v-show="gameStore.showAudioSettings" 
             class="bg-gray-800 p-4 rounded-lg shadow-lg mt-2 absolute right-0 top-12 w-64">
          <h3 class="text-lg font-bold mb-2">Audio Settings</h3>
          <div class="flex flex-col gap-2">
            <label class="flex items-center gap-2">
              <input type="checkbox" v-model="gameStore.bgmEnabled" 
                     @change="(e: Event) => gameStore.setBgmEnabled((e.target as HTMLInputElement).checked)"
                     class="w-4 h-4">
              <span>Background Music</span>
            </label>
            <label class="flex items-center gap-2">
              <input type="checkbox" v-model="gameStore.sfxEnabled" 
                     @change="(e: Event) => gameStore.setSfxEnabled((e.target as HTMLInputElement).checked)"
                     class="w-4 h-4">
              <span>Sound Effects</span>
            </label>
          </div>
        </div>
      </div>

      <button @click="gameStore.toggleGameHistory" 
              class="bg-gray-800 p-3 rounded-lg shadow-lg hover:bg-gray-700 transition-colors duration-200">
        <i class="fas fa-history text-white text-xl"></i>
      </button>
      <div v-show="gameStore.showGameHistory" 
           class="bg-gray-800 p-4 rounded-lg shadow-lg mt-2 absolute right-0 top-12 w-96">
        <h3 class="text-lg font-bold mb-2">Recent Games</h3>
        <div class="flex flex-col gap-2 overflow-y-auto max-h-96">
          <div v-for="(game, index) in gameStore.gameHistory" :key="index" 
               class="p-2 bg-gray-700 rounded">
            <div class="text-sm">{{ new Date(game.date).toLocaleString() }}</div>
            <div class="text-sm">{{ game.mode === GameMode.SinglePlayer ? 'Single Player' : 'Multi Player' }}</div>
            <div class="text-sm">Players: {{ game.players }}</div>
            <div class="text-sm">Scores: {{ game.scores.join(', ') }}</div>
          </div>
        </div>
      </div>

      <div class="relative">
        <button @click="gameStore.toggleGameOptions" 
                class="bg-gray-800 p-3 rounded-lg shadow-lg hover:bg-gray-700 transition-colors duration-200">
          <i class="fas fa-bars text-white text-xl"></i>
        </button>
        <div v-show="gameStore.showGameOptions" 
             class="bg-gray-800 p-4 rounded-lg shadow-lg mt-2 absolute right-0 top-12 w-64">
          <h3 class="text-lg font-bold mb-2">Game Options</h3>
          <div class="flex flex-col gap-2">
            <button @click="gameStore.restartGame" 
                    class="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors duration-200">
              Restart Game
            </button>
            <button @click="gameStore.newGame" 
                    class="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors duration-200">
              New Game
            </button>
          </div>
        </div>
      </div>
    </div>

    <GameMode v-if="!gameStore.gameIsActive" @start-game="startGame" />
    <GameBoard v-else :game="gameStore.currentGame" @end-game="endGame" />
  </div>
</template>

<script setup lang="ts">
import GameMode from './components/GameMode.vue'
import GameBoard from './components/GameBoard.vue'
import { useGameStore } from './stores/gameStore'
import { GameMode as GameModeEnum } from './enums/GameMode'

const gameStore = useGameStore()

const startGame = (mode: GameModeEnum) => {
  gameStore.initializeGame(mode)
}

const endGame = () => {
  gameStore.endGame()
}
</script> 