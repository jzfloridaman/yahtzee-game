<template>
  <div id="app">
    <div id="score-animation-container"></div>
    <!-- Audio Settings Menu -->
    <div id="audio-settings-container" class="fixed top-4 right-4 z-50 flex gap-2">
      <div class="relative">
        <button @click="toggleAudioSettings" class="bg-gray-800 p-3 rounded-lg shadow-lg hover:bg-gray-700 transition-colors duration-200">
          <i class="fas fa-volume-up text-white text-xl"></i>
        </button>
        <div v-show="showAudioSettings" class="bg-gray-800 p-4 rounded-lg shadow-lg mt-2 absolute right-0 top-12 w-64">
          <h3 class="text-lg font-bold mb-2">Audio Settings</h3>
          <div class="flex flex-col gap-2">
            <label class="flex items-center gap-2">
              <input type="checkbox" v-model="bgmEnabled" class="w-4 h-4">
              <span>Background Music</span>
            </label>
            <label class="flex items-center gap-2">
              <input type="checkbox" v-model="sfxEnabled" class="w-4 h-4">
              <span>Sound Effects</span>
            </label>
          </div>
        </div>
      </div>

      <button @click="toggleGameHistory" class="bg-gray-800 p-3 rounded-lg shadow-lg hover:bg-gray-700 transition-colors duration-200">
        <i class="fas fa-history text-white text-xl"></i>
      </button>
      <div v-show="showGameHistory" class="bg-gray-800 p-4 rounded-lg shadow-lg mt-2 absolute right-0 top-12 w-96">
        <h3 class="text-lg font-bold mb-2">Recent Games</h3>
        <div class="flex flex-col gap-2 overflow-y-auto">
          <!-- Game history items will be inserted here -->
        </div>
      </div>

      <div class="relative">
        <button @click="toggleGameOptions" class="bg-gray-800 p-3 rounded-lg shadow-lg hover:bg-gray-700 transition-colors duration-200">
          <i class="fas fa-bars text-white text-xl"></i>
        </button>
        <div v-show="showGameOptions" class="bg-gray-800 p-4 rounded-lg shadow-lg mt-2 absolute right-0 top-12 w-64">
          <h3 class="text-lg font-bold mb-2">Game Options</h3>
          <div class="flex flex-col gap-2">
            <button @click="restartGame" class="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors duration-200">
              Restart Game
            </button>
            <button @click="newGame" class="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors duration-200">
              New Game
            </button>
          </div>
        </div>
      </div>
    </div>

    <GameModeComponent v-if="gameState === 'MainMenu'" @start-game="startGame" />
    <GameBoard v-else-if="gameState === 'Playing'" :game="game" />
    <GameOver v-else-if="gameState === 'GameOver'" :game="game" @play-again="resetGame" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { YahtzeeGame } from './game'
import { GameMode } from './enums/GameMode'
import GameModeComponent from './components/GameMode.vue'
import GameBoard from './components/GameBoard.vue'
import GameOver from './components/GameOver.vue'

const game = new YahtzeeGame()
const gameState = ref('MainMenu')

// Audio settings
const showAudioSettings = ref(false)
const bgmEnabled = ref(localStorage.getItem('bgmEnabled') === 'true')
const sfxEnabled = ref(localStorage.getItem('sfxEnabled') === 'true')

// Game history
const showGameHistory = ref(false)

// Game options
const showGameOptions = ref(false)

const toggleAudioSettings = () => {
  showAudioSettings.value = !showAudioSettings.value
}

const toggleGameHistory = () => {
  showGameHistory.value = !showGameHistory.value
}

const toggleGameOptions = () => {
  showGameOptions.value = !showGameOptions.value
}

const restartGame = () => {
  game.startNewGame(game.getPlayerCount())
  gameState.value = 'Playing'
}

const newGame = () => {
  gameState.value = 'MainMenu'
}

const startGame = (mode: string, players: number) => {
  game.setGameMode(mode === 'sp' ? GameMode.SinglePlayer : GameMode.MultiPlayer)
  game.setPlayers(players)
  game.startNewGame(players)
  gameState.value = 'Playing'
}

const resetGame = () => {
  gameState.value = 'MainMenu'
}

// Watch for changes in audio settings
watch(bgmEnabled, (newValue) => {
  localStorage.setItem('bgmEnabled', newValue.toString())
  // Add your background music control logic here
})

watch(sfxEnabled, (newValue) => {
  localStorage.setItem('sfxEnabled', newValue.toString())
  // Add your sound effects control logic here
})

onMounted(() => {
  game.onStateChange((newState, oldState) => {
    gameState.value = newState
  })
})
</script> 