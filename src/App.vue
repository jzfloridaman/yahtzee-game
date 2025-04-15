<template>
  <div>
    <!-- Overlay & Menus-->
    <div class="overlay" :class="{ active: isAnyMenuOpen }" @click="closeAllMenus()"></div>
    <div class="fixed top-4 right-4 z-50 flex gap-2">
      <div class="relative">
        <button @click="toggleAudioSettings" 
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

      <button @click="toggleGameHistory" 
              class="bg-gray-800 p-3 rounded-lg shadow-lg hover:bg-gray-700 transition-colors duration-200">
        <i class="fas fa-history text-white text-xl"></i>
      </button>
      <div v-show="gameStore.showGameHistory" 
           class="bg-gray-800 p-4 rounded-lg shadow-lg mt-2 absolute right-0 top-12 w-96">
        <h3 class="text-lg font-bold mb-2">Recent Games</h3>
        <div class="flex flex-col gap-2 overflow-y-auto max-h-96">
          <div v-for="(game, index) in gameStore.gameHistory" :key="index" 
               class="p-3 bg-gray-700 rounded">
            <div class="text-sm mb-1">{{ new Date(game.date).toLocaleString() }}</div>
            <div class="text-sm mb-1">{{ game.mode === GameModeEnum.SinglePlayer ? 'Single Player' : 'Multi Player' }}</div>
            <div class="grid gap-1">
              <div v-for="playerScore in game.scores" :key="playerScore.playerNumber"
                   class="text-sm grid grid-cols-2 items-center bg-gray-600/50 p-1 rounded">
                <span>Player {{ playerScore.playerNumber }}</span>
                <span class="text-right font-bold">{{ playerScore.score }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="relative" v-if="gameStore.gameMode !== null">
        <button @click="toggleGameOptions" 
                class="bg-gray-800 p-3 rounded-lg shadow-lg hover:bg-gray-700 transition-colors duration-200">
          <i class="fas fa-bars text-white text-xl"></i>
        </button>
        <div v-show="gameStore.showGameOptions" 
             class="bg-gray-800 p-4 rounded-lg shadow-lg mt-2 absolute right-0 top-12 w-64">
          <h3 class="text-lg font-bold mb-2">Game Options</h3>
          <div class="flex flex-col gap-2">
            <button @click="restartGame" 
                    class="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors duration-200">
              Restart Game
            </button>
            <button @click="newGame" 
                    class="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors duration-200">
              New Game
            </button>
          </div>
        </div>
      </div>
    </div>

    <GameMode v-if="!gameStore.gameIsActive" @start-game="startGame" />
    <GameBoard v-else-if="!gameStore.gameIsOver" @end-game="endGame" />
    <GameOver v-if="gameStore.gameIsOver" @restart-game="newGame" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import GameMode from './components/GameMode.vue'
import GameBoard from './components/GameBoard.vue'
import GameOver from './components/GameOver.vue'
import { useGameStore } from './stores/gameStore'
import { GameMode as GameModeEnum } from './enums/GameMode'
import { SoundEffects, SoundVolumes } from './enums/SoundEffects'

const gameStore = useGameStore()

// Audio setup
const musicTracks = [
  '/yahtzee/music/bgsample.mp3',
  '/yahtzee/music/bgsample-2.mp3',
  '/yahtzee/music/bgsample-3.mp3'
]
let backgroundMusic: HTMLAudioElement | null = null

// Sound effect cache to prevent creating new Audio objects repeatedly
const soundCache: { [key in SoundEffects]?: HTMLAudioElement } = {}

const playSoundEffect = (effect: SoundEffects) => {
  if (!gameStore.sfxEnabled) return

  // Create or get cached audio element
  if (!soundCache[effect]) {
    soundCache[effect] = new Audio(effect)
    soundCache[effect]!.volume = SoundVolumes[effect]
  }

  // Clone the audio to allow overlapping sounds
  const sound = soundCache[effect]!.cloneNode() as HTMLAudioElement
  sound.play().catch(error => {
    console.log("Error playing sound effect:", error)
  })
}

// Expose the playSoundEffect function to the store
gameStore.playSoundEffect = playSoundEffect

const initializeBackgroundMusic = () => {
  if (!gameStore.bgmEnabled) return

  // Randomly select a track
  const randomTrack = musicTracks[Math.floor(Math.random() * musicTracks.length)]
  backgroundMusic = new Audio(randomTrack)
  backgroundMusic.loop = true
  backgroundMusic.volume = 0.4

  // Start playing on user interaction
  const startMusic = () => {
    if (backgroundMusic && backgroundMusic.paused && gameStore.bgmEnabled) {
      backgroundMusic.play().catch(error => {
        console.log("Error playing background music:", error)
      })
    }
  }
  document.addEventListener('click', startMusic, { once: true })
}

// Watch for changes in background music setting
watch(() => gameStore.bgmEnabled, (newValue) => {
  if (newValue) {
    if (!backgroundMusic) {
      initializeBackgroundMusic()
    } else {
      backgroundMusic.play().catch(console.error)
    }
  } else if (backgroundMusic) {
    backgroundMusic.pause()
  }
})

// Initialize music on component mount
onMounted(() => {
  initializeBackgroundMusic()
})

const startGame = (mode: GameModeEnum, players?: number) => {
  gameStore.initializeGame(mode, players);
}

const endGame = () => {
  gameStore.endGame();
}

const restartGame = () => {
  closeAllMenus();
  gameStore.restartGame();
}

const newGame = () => {
  closeAllMenus();
  gameStore.newGame();
}

const closeAllMenus = (menu?: string) => {
  if(menu !== 'audio'){
    gameStore.showAudioSettings = false;
  }
  if(menu !== 'history'){
    gameStore.showGameHistory = false;
  }
  if(menu !== 'options'){
    gameStore.showGameOptions = false;
  }
}

const toggleAudioSettings = () => {
  closeAllMenus('audio');
  gameStore.showAudioSettings = !gameStore.showAudioSettings;
}

const toggleGameHistory = () => {
  closeAllMenus('history');
  gameStore.showGameHistory = !gameStore.showGameHistory;
}

const toggleGameOptions = () => {
  closeAllMenus('options');
  gameStore.showGameOptions = !gameStore.showGameOptions;
}

const isAnyMenuOpen = computed(() => {
  return gameStore.showAudioSettings || gameStore.showGameHistory || gameStore.showGameOptions;
});

</script> 
<style>
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.75); /* Semi-transparent black */
  opacity: 0;
  z-index: -10;
  transition: opacity 0.75s ease;
}
.overlay.active {
  opacity: 1;
  z-index: 40;
}
</style>