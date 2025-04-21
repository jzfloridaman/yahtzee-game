<template>
  <div>
    <!-- Connection Lost Message -->
    <div v-if="peerStore.connectionLost && !gameStore.gameIsOver" class="fixed inset-0 z-[5000] flex items-center justify-center bg-black bg-opacity-70">
      <div class="bg-red-700 text-white p-8 rounded-lg shadow-lg text-center max-w-xs mx-auto">
        <h2 class="text-2xl font-bold mb-2">Connection Lost</h2>
        <p class="mb-4">The connection to your opponent has been lost. Please try to reconnect or start a new game.</p>
        <button @click="handleNewGame" class="bg-white text-red-700 font-bold px-4 py-2 rounded hover:bg-gray-200 transition">New Game</button>
      </div>
    </div>
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

      <!-- Chat Menu Button -->
      <div class="relative">
        <button @click="toggleChatMenu"
                class="bg-gray-800 p-3 rounded-lg shadow-lg hover:bg-gray-700 transition-colors duration-200">
          <i class="fas fa-comment-dots text-white text-xl"></i>
        </button>
        <div v-show="showChatMenu" 
             class="bg-gray-800 p-4 rounded-lg shadow-lg mt-2 absolute right-0 top-12 w-64">
          <h3 class="text-lg font-bold mb-2">Chat</h3>
          <div class="flex flex-wrap gap-2">
            <span v-for="emoji in chatEmojis" :key="emoji" class="text-2xl cursor-pointer select-none hover:scale-125 transition-transform" @click="showEmojiAnimation(emoji)">{{ emoji }}</span>
          </div>
        </div>
      </div>

      <div class="relative" v-if="gameStore.isGameActive">
        <button @click="toggleGameOptions" 
                class="bg-gray-800 p-3 rounded-lg shadow-lg hover:bg-gray-700 transition-colors duration-200">
          <i class="fas fa-bars text-white text-xl"></i>
        </button>
        <div v-show="gameStore.showGameOptions" 
             class="bg-gray-800 p-4 rounded-lg shadow-lg mt-2 absolute right-0 top-12 w-64">
          <h3 class="text-lg font-bold mb-2">Game Options</h3>
          <div class="flex flex-col gap-2">
            <button @click="endHostGame" 
                    v-if="peerStore.isHost"
                    class="bg-red-800 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors duration-200">
              End Game
            </button>
            <button @click="restartGame" 
                    class="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors duration-200">
              Restart Game
            </button>
            <button @click="newGame" 
                    class="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors duration-200">
              Select Game
            </button>
          </div>
        </div>
      </div>
    </div>

    <GameMode v-if="!gameStore.gameIsActive" @start-game="startGame" />
    <GameBoard v-else-if="!gameStore.gameIsOver" @end-game="endGame" />
    <GameOver v-if="gameStore.gameIsOver" @restart-game="newGame" />

    <!-- Emoji Animation -->
    <transition name="emoji-fade">
      <div v-if="animatedEmoji" class="emoji-animation">{{ animatedEmoji }}</div>
    </transition>

    <div class="hidden grid-cols-3 grid-cols-4">Tailwind forced classes</div>
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
import { usePeerStore } from './stores/peerStore'

const gameStore = useGameStore()
const peerStore = usePeerStore()

// Chat menu state and emojis
const showChatMenu = ref(false)
const chatEmojis = [
  '💩','😀', '😂', '😎', '😍', '😡', '😭', '👍', '👎', '🎲', '🔥', '👏', '🤔', '🥳', '😱', '😴', '💯', '🍀', '🍻', '🏆', '🤝' 
]

const animatedEmoji = ref('')

const toggleChatMenu = () => {
  closeAllMenus('chat');
  showChatMenu.value = !showChatMenu.value;
}

// Audio setup
const musicTracks = [
  '/music/bgsample.mp3',
  '/music/bgsample-2.mp3',
  '/music/bgsample-3.mp3'
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

const endHostGame = () => {

  peerStore.sendData({
    type: 'gameOver',
    data: {
      gameId: 'game over'
    }
  });

  /// wait some time then close all menus, end game, and disconnect
  setTimeout(() => {
    closeAllMenus();
    gameStore.endGame();
    peerStore.disconnect();
  }, 1000);

}

const restartGame = () => {
  closeAllMenus();
  gameStore.restartGame();
}

const newGame = () => {
  closeAllMenus();
  gameStore.newGame();
  peerStore.connectionLost = false;
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
  if(menu !== 'chat'){
    showChatMenu.value = false;
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
  return gameStore.showAudioSettings || gameStore.showGameHistory || gameStore.showGameOptions || showChatMenu.value;
});

function handleNewGame() {
  newGame();
}

function showEmojiAnimation(emoji: string) {
  animatedEmoji.value = emoji
  setTimeout(() => {
    animatedEmoji.value = ''
  }, 1200)
}

</script>

<style scoped>
.emoji-animation {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 6rem;
  z-index: 9999;
  pointer-events: none;
  opacity: 1;
  animation: emojiGrowFade 1.2s cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
  text-shadow: 0 0 20px rgba(0,0,0,0.2);
}
@keyframes emojiGrowFade {
  0% {
    transform: translate(-50%, -50%) scale(0.5);
    opacity: 0;
  }
  20% {
    transform: translate(-50%, -50%) scale(1.2);
    opacity: 1;
  }
  60% {
    transform: translate(-50%, -50%) scale(1.1);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(2.5);
    opacity: 0;
  }
}
.emoji-fade-enter-active, .emoji-fade-leave-active {
  transition: opacity 0.3s;
}
.emoji-fade-enter-from, .emoji-fade-leave-to {
  opacity: 0;
}
</style> 